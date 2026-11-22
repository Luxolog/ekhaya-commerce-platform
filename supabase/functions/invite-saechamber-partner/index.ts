import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://ekhayatech.co.za",
  "https://www.ekhayatech.co.za",
  "https://pricechecker.ekhayatech.co.za",
  "https://ekhaya-commerce-platform-8ewwsmmvz-luxolog.vercel.app",
  "https://ekhaya-commerce-platform-git-feature-sa-echamber-9c60e1-luxolog.vercel.app",
]);
const isAllowedOrigin = (origin: string) =>
  allowedOrigins.has(origin) ||
  /^https:\/\/ekhaya-commerce-platform-[a-z0-9-]+-luxolog\.vercel\.app$/.test(origin);
const corsFor = (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  return {
  "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://pricechecker.ekhayatech.co.za",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  };
};

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Sign-in required" }), { status: 401, headers: cors });

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: cors });

  const admin = createClient(url, service);
  const { data: owner } = await admin.from("partner_owner_access").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!owner) return new Response(JSON.stringify({ error: "Not authorised to manage partner invitations" }), { status: 403, headers: cors });

  const jwtPart = authHeader.slice("Bearer ".length).split(".")[1] ?? "";
  let sessionId = "";
  try {
    const normalized = jwtPart.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
  } catch { /* fail closed */ }
  if (!sessionId) return new Response(JSON.stringify({ error: "A valid owner session is required." }), { status: 401, headers: cors });
  const { data: security } = await admin.from("account_security_settings").select("email_otp_enabled").eq("user_id", user.id).maybeSingle();
  if (security?.email_otp_enabled === true) {
    const { data: verified } = await admin.from("email_otp_verified_sessions").select("session_id")
      .eq("user_id", user.id).eq("session_id", sessionId).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!verified) return new Response(JSON.stringify({ error: "Email verification is required to manage partner invitations.", code: "EMAIL_OTP_REQUIRED" }), { status: 403, headers: cors });
  }

  let body: { action?: string; partner_id?: string; email?: string; contact_name?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: cors }); }

  if (body.action === "create_partner") {
    const partnerName = typeof body.partner_name === "string" ? body.partner_name.trim().replace(/\s+/g, " ") : "";
    const requestedSlug = typeof body.partner_slug === "string" ? body.partner_slug.trim().toLowerCase() : "";
    const requestedCode = typeof body.referral_code === "string" ? body.referral_code.trim().toUpperCase() : "";
    const slug = (requestedSlug || partnerName.toLowerCase())
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    const referralCode = (requestedCode || slug.replace(/-/g, "").toUpperCase()).replace(/[^A-Z0-9]/g, "").slice(0, 24);
    if (partnerName.length < 2 || partnerName.length > 120)
      return new Response(JSON.stringify({ error: "Enter a partner organisation name between 2 and 120 characters." }), { status: 400, headers: cors });
    if (!slug || slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      return new Response(JSON.stringify({ error: "Enter a valid partner slug using letters, numbers and hyphens." }), { status: 400, headers: cors });
    if (referralCode.length < 4 || referralCode.length > 24)
      return new Response(JSON.stringify({ error: "Referral codes must contain 4 to 24 letters or numbers." }), { status: 400, headers: cors });
    const { data: existing, error: lookupError } = await admin.from("partner_programs")
      .select("id,partner_name,partner_slug,referral_code")
      .or("partner_slug.eq." + slug + ",referral_code.eq." + referralCode);
    if (lookupError) return new Response(JSON.stringify({ error: "Could not check existing partner names and referral codes." }), { status: 500, headers: cors });
    if (existing?.length) {
      const slugTaken = existing.some(item => item.partner_slug === slug);
      const codeTaken = existing.some(item => item.referral_code === referralCode);
      return new Response(JSON.stringify({ error: slugTaken ? "That partner slug is already in use." : codeTaken ? "That referral code is already in use." : "A partner with those details already exists." }), { status: 409, headers: cors });
    }
    const { data: partner, error: createError } = await admin.from("partner_programs")
      .insert({ partner_name: partnerName, partner_slug: slug, referral_code: referralCode, status: "pending" })
      .select("id,partner_name,partner_slug,referral_code,partner_user_id,status,program_live_at,created_at")
      .single();
    if (createError || !partner) {
      if (createError?.code === "23505") return new Response(JSON.stringify({ error: "The partner slug or referral code is already registered. Refresh and try different values." }), { status: 409, headers: cors });
      console.error("Partner programme creation failed:", createError);
      return new Response(JSON.stringify({ error: "Could not register the partner programme." }), { status: 500, headers: cors });
    }
    return new Response(JSON.stringify({ success: true, partner, message: "Partner programme registered in pending status. It will not attribute referrals until activated." }), { status: 201, headers: cors });
  }

  if (body.action === "list") {
    const { data, error } = await admin.from("partner_invitations")
      .select("id,partner_id,invited_email,contact_name,status,invited_at,expires_at,accepted_at")
      .order("invited_at", { ascending: false }).limit(200);
    if (error) return new Response(JSON.stringify({ error: "Could not load partner invitations" }), { status: 500, headers: cors });
    return new Response(JSON.stringify({ invitations: data || [] }), { status: 200, headers: cors });
  }

  const partnerId = (body.partner_id || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const contactName = (body.contact_name || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(partnerId))
    return new Response(JSON.stringify({ error: "Select a valid partner programme" }), { status: 400, headers: cors });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return new Response(JSON.stringify({ error: "Enter a valid invitation email address" }), { status: 400, headers: cors });
  if (!contactName || contactName.length > 120)
    return new Response(JSON.stringify({ error: "Enter the partner contact's name (maximum 120 characters)" }), { status: 400, headers: cors });
  if (email === user.email?.toLowerCase())
    return new Response(JSON.stringify({ error: "Use a separate email address for the partner account" }), { status: 400, headers: cors });

  const { data: partner, error: partnerError } = await admin.from("partner_programs")
    .select("id,partner_name,partner_slug,partner_user_id").eq("id", partnerId).single();
  if (partnerError || !partner) return new Response(JSON.stringify({ error: "Partner programme not found" }), { status: 404, headers: cors });
  if (partner.partner_user_id) return new Response(JSON.stringify({ error: "This partner already has a linked owner account" }), { status: 409, headers: cors });

  const { data: existing } = await admin.from("partner_invitations")
    .select("id,status,expires_at").eq("partner_id", partner.id).eq("invited_email", email).maybeSingle();
  if (existing?.status === "accepted") return new Response(JSON.stringify({ error: "This email has already accepted the partner invitation" }), { status: 409, headers: cors });
  if (existing?.status === "pending" && new Date(existing.expires_at) > new Date())
    return new Response(JSON.stringify({ error: "A valid invitation is already pending for this email" }), { status: 409, headers: cors });

  const { data: invitation, error: insertError } = await admin.from("partner_invitations").upsert({
    ...(existing?.id ? { id: existing.id } : {}),
    partner_id: partner.id,
    invited_email: email,
    contact_name: contactName,
    invited_by: user.id,
    status: "pending",
    invited_at: new Date().toISOString(),
    accepted_at: null,
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: "partner_id,invited_email" }).select("id").single();
  if (insertError || !invitation) return new Response(JSON.stringify({ error: "Could not create invitation record" }), { status: 500, headers: cors });

  const requestOrigin = req.headers.get("Origin") || "";
  const redirectOrigin = isAllowedOrigin(requestOrigin) ? requestOrigin : "https://ekhayatech.co.za";
  const redirectTo = redirectOrigin + "/account/?partner_invite=" + invitation.id;
  // Existing Ekhaya users keep their current account and password. Send a
  // magic sign-in link that returns them to the partner invitation acceptance.
  const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) {
    await admin.from("partner_invitations").update({ status: "revoked" }).eq("id", invitation.id);
    return new Response(JSON.stringify({ error: "Could not verify whether this email already has an Ekhaya account." }), { status: 500, headers: cors });
  }
  const existingUser = authUsers.users.find(item => item.email?.toLowerCase() === email);
  if (existingUser) {
    const mailClient = createClient(url, anon);
    const { error: magicLinkError } = await mailClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (magicLinkError) {
      await admin.from("partner_invitations").update({ status: "revoked" }).eq("id", invitation.id);
      return new Response(JSON.stringify({ error: magicLinkError.message }), { status: 400, headers: cors });
    }
    return new Response(JSON.stringify({
      success: true,
      invitation_id: invitation.id,
      partner_name: partner.partner_name,
      invited_email: email,
      expires_in_days: 14,
      existing_account: true,
      message: "Partner invitation sign-in link sent. The recipient will keep their existing Ekhaya account and password.",
    }), { status: 200, headers: cors });
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      partner_invitation_id: invitation.id,
      partner_id: partner.id,
      partner_slug: partner.partner_slug,
      partner_name: partner.partner_name,
      contact_name: contactName,
    },
  });
  if (inviteError) {
    await admin.from("partner_invitations").update({ status: "revoked" }).eq("id", invitation.id);
    return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: cors });
  }
  return new Response(JSON.stringify({ success: true, invitation_id: invitation.id, partner_name: partner.partner_name, invited_email: email, expires_in_days: 14 }), { status: 200, headers: cors });
});