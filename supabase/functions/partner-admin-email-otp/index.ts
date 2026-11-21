import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const encoder = new TextEncoder();

function claimsFromJwt(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid session token.");
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
}
async function digest(value: string) {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(result)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}
function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Security service is not configured." }, 503);
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return json({ error: "Sign in is required." }, 401);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Your session is invalid or expired." }, 401);

  let claims: Record<string, unknown>;
  try { claims = claimsFromJwt(token); } catch { return json({ error: "Invalid session claims." }, 401); }
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
  const expiresAt = Number(claims.exp);
  if (!sessionId || !Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
    return json({ error: "This session cannot be verified. Please sign in again." }, 401);
  }

  const admin = createClient(url, service);
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const isOwner = app.role === "owner" || app.is_owner === true ||
    Boolean((await admin.from("partner_owner_access").select("user_id").eq("user_id", user.id).maybeSingle()).data);
  const { data: partner } = await admin.from("partner_programs").select("id").eq("partner_user_id", user.id).limit(1).maybeSingle();
  const isPartner = Boolean(partner);
  if (!isOwner && !isPartner) return json({ error: "Partner or Admin account access is required." }, 403);

  let body: { action?: string; code?: string; password?: string; enabled?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Valid JSON is required." }, 400); }
  const { data: settings } = await admin.from("account_security_settings")
    .select("email_otp_enabled").eq("user_id", user.id).maybeSingle();
  const enabled = settings?.email_otp_enabled === true;

  if (body.action === "status") {
    const { data: verified } = await admin.from("email_otp_verified_sessions").select("session_id")
      .eq("user_id", user.id).eq("session_id", sessionId).gt("expires_at", new Date().toISOString()).maybeSingle();
    return json({ enabled, verified: Boolean(verified), email: user.email ?? null, account_type: isOwner ? "admin" : "partner" });
  }

  if (body.action === "start") {
    if (!enabled) return json({ error: "Email OTP is not enabled for this account." }, 409);
    if (!user.email || !user.email_confirmed_at) return json({ error: "A confirmed registered email address is required." }, 409);
    const { data: recent } = await admin.from("email_otp_challenges").select("created_at")
      .eq("user_id", user.id).eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return json({ error: "A code was sent recently. Please wait one minute before requesting another." }, 429);
    }
    const host = Deno.env.get("SMTP_HOST");
    const port = Number(Deno.env.get("SMTP_PORT") || 465);
    const username = Deno.env.get("SMTP_USERNAME");
    const password = Deno.env.get("SMTP_PASSWORD");
    if (!host || !username || !password) return json({ error: "Email delivery is not configured. Please contact Ekhaya support." }, 503);

    const code = newCode();
    const pepper = service;
    const codeHash = await digest([user.id, sessionId, code, pepper].join(":"));
    const { data: challenge, error: insertError } = await admin.from("email_otp_challenges").insert({
      user_id: user.id, session_id: sessionId, code_hash: codeHash,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }).select("id").single();
    if (insertError || !challenge) return json({ error: "Could not create a verification challenge." }, 500);

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user: username, pass: password },
      connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000,
    });
    try {
      const name = escapeHtml(String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "there"));
      await transporter.sendMail({
        from: { name: "Ekhaya Technologies", address: username },
        to: user.email,
        subject: "Your Ekhaya security verification code",
        text: `Hello ${String(user.user_metadata?.display_name ?? "there")},\n\nYour Ekhaya sign-in verification code is ${code}. It expires in five minutes. Do not share this code with anyone.\n\nEkhaya Technologies`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:30px auto;padding:28px;border:1px solid #dce8f1;border-radius:10px;color:#10243e"><div style="font-weight:800;letter-spacing:1px">EKHAYA TECHNOLOGIES</div><h2 style="margin:26px 0 12px">Verify your sign-in</h2><p>Hello ${name},</p><p>Use this one-time code to complete your sign-in:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:18px;background:#f3f7fb;border-radius:8px;text-align:center">${code}</div><p>This code expires in five minutes. You have a limited number of attempts. Do not share it with anyone.</p><p style="color:#71869a;font-size:12px">If you did not attempt to sign in, change your password and contact Ekhaya support.</p></div>`,
      });
    } catch (error) {
      await admin.from("email_otp_challenges").delete().eq("id", challenge.id);
      return json({ error: "We could not send the verification email. Please try again or contact support." }, 502);
    } finally {
      try { await transporter.close(); } catch { /* ignore */ }
    }
    return json({ ok: true, challenge_id: challenge.id, expires_in: 300, email_hint: user.email.replace(/^(.).+(@.*)$/, "$1••••$2") });
  }

  if (body.action === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) return json({ error: "Enter the six-digit code from your email." }, 400);
    const { data: challenge } = await admin.from("email_otp_challenges").select("id,code_hash,expires_at,attempts")
      .eq("user_id", user.id).eq("session_id", sessionId).is("consumed_at", null)
      .gt("expires_at", new Date().toISOString()).lt("attempts", 5)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!challenge) return json({ error: "This code has expired or is no longer valid. Request a new code." }, 410);
    const supplied = await digest([user.id, sessionId, code, service].join(":"));
    if (supplied !== challenge.code_hash) {
      await admin.from("email_otp_challenges").update({ attempts: challenge.attempts + 1 }).eq("id", challenge.id);
      return json({ error: "That code is incorrect. Check the email and try again." }, 400);
    }
    await admin.from("email_otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);
    const { error: verifyError } = await admin.from("email_otp_verified_sessions").upsert({
      user_id: user.id, session_id: sessionId, verified_at: new Date().toISOString(),
      expires_at: new Date(expiresAt * 1000).toISOString(),
    });
    if (verifyError) return json({ error: "Verification could not be saved. Please try again." }, 500);
    return json({ ok: true, verified: true });
  }

  if (body.action === "update") {
    if (typeof body.enabled !== "boolean" || !body.password) return json({ error: "Enter your current password and choose whether email OTP is enabled." }, 400);
    const reauth = await fetch(new URL("/auth/v1/token?grant_type=password", url), {
      method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: body.password }),
    });
    const reauthBody = await reauth.json().catch(() => ({}));
    if (!reauth.ok || reauthBody.user?.id !== user.id) return json({ error: "Your current password could not be confirmed." }, 401);
    if (enabled && body.enabled === false) {
      const { data: verified } = await admin.from("email_otp_verified_sessions").select("session_id")
        .eq("user_id", user.id).eq("session_id", sessionId).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (!verified) return json({ error: "Verify your current email OTP before disabling this protection." }, 403);
    }
    const { error: updateError } = await admin.from("account_security_settings").upsert({
      user_id: user.id, email_otp_enabled: body.enabled, updated_at: new Date().toISOString(),
    });
    if (updateError) return json({ error: "Could not update your security preference." }, 500);
    return json({ ok: true, enabled: body.enabled });
  }

  return json({ error: "Unknown security action." }, 400);
});
