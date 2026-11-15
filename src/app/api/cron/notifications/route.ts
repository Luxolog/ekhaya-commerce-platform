import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char] ?? char));

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const smtpPassword = process.env.SMTP_PASSWORD;
  if (!supabaseUrl || !serviceKey || !smtpPassword) {
    return NextResponse.json({ error: "Email delivery is not configured. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SMTP_PASSWORD." }, { status: 503 });
  }

  const baseHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const pendingResponse = await fetch(
    new URL("/rest/v1/user_notifications?email_status=eq.pending&select=id,user_id,title,message,action_url,created_at&order=created_at.asc&limit=25", supabaseUrl),
    { headers: baseHeaders, cache: "no-store" }
  );
  if (!pendingResponse.ok) return NextResponse.json({ error: "Could not load pending notification emails." }, { status: 502 });
  const pending = await pendingResponse.json() as Array<{id:string;user_id:string;title:string;message:string;action_url:string|null;created_at:string}>;
  if (!pending.length) return NextResponse.json({ ok: true, sent: 0, failed: 0 });

  const usersResponse = await fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: baseHeaders, cache: "no-store" });
  if (!usersResponse.ok) return NextResponse.json({ error: "Could not resolve notification recipients." }, { status: 502 });
  const userPayload = await usersResponse.json();
  const users = Array.isArray(userPayload) ? userPayload : userPayload.users ?? [];
  const emailById = new Map<string,string>(users.filter((user:Record<string,unknown>) => typeof user.id === "string" && typeof user.email === "string").map((user:Record<string,string>) => [user.id, user.email]));

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mail.ekhayatech.co.za",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth: { user: process.env.SMTP_USER || "hello@ekhayatech.co.za", pass: smtpPassword },
  });

  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const recipient = emailById.get(item.user_id);
    if (!recipient) {
      await fetch(new URL(`/rest/v1/user_notifications?id=eq.${item.id}`, supabaseUrl), {
        method: "PATCH", headers: { ...baseHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email_status: "skipped", email_error: "No email address found for this account." })
      });
      continue;
    }

    const claim = await fetch(new URL(`/rest/v1/user_notifications?id=eq.${item.id}&email_status=eq.pending`, supabaseUrl), {
      method: "PATCH", headers: { ...baseHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ email_status: "failed", email_error: "Delivery attempt in progress." })
    });
    if (!claim.ok || !(await claim.json()).length) continue;

    try {
      const safeTitle = escapeHtml(item.title);
      const safeMessage = escapeHtml(item.message);
      const safeAction = item.action_url && /^https:\/\//i.test(item.action_url)
        ? `<p><a href="${escapeHtml(item.action_url)}" style="background:#079bd3;color:#fff;padding:12px 18px;text-decoration:none;border-radius:7px">View in Ekhaya Price Checker</a></p>`
        : "";
      await transporter.sendMail({
        from: `Ekhaya Tech <${process.env.SMTP_USER || "hello@ekhayatech.co.za"}>`,
        to: recipient,
        subject: item.title,
        text: `${item.title}\n\n${item.message}${item.action_url ? "\n\n" + item.action_url : ""}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#10253b"><h2>${safeTitle}</h2><p style="line-height:1.6">${safeMessage}</p>${safeAction}<p style="font-size:12px;color:#718096">Ekhaya Tech · The Ekhaya Price Checker team</p></div>`,
      });
      await fetch(new URL(`/rest/v1/user_notifications?id=eq.${item.id}`, supabaseUrl), {
        method: "PATCH", headers: { ...baseHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null })
      });
      sent++;
    } catch (error) {
      await fetch(new URL(`/rest/v1/user_notifications?id=eq.${item.id}`, supabaseUrl), {
        method: "PATCH", headers: { ...baseHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email_status: "pending", email_error: error instanceof Error ? error.message.slice(0, 500) : "SMTP delivery failed." })
      });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, processed: pending.length });
}
