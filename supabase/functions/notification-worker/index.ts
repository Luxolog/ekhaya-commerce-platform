import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = Deno.env.get("NOTIFICATION_WORKER_TOKEN");
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const workerTokenValid = Boolean(token && req.headers.get("x-worker-token") === token);
  const internalServiceAuth = Boolean(key && req.headers.get("authorization") === `Bearer ${key}`);
  if (!workerTokenValid && !internalServiceAuth) return json({ error: "Unauthorized" }, 401);
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") || 465);
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");
  if (!base || !key || !host || !username || !password) return json({ error: "Configuration incomplete" }, 503);

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const queueUrl = new URL("/rest/v1/user_notifications", base);
  queueUrl.searchParams.set("email_status", "eq.pending");
  queueUrl.searchParams.set("email_attempted_at", "is.null");
  queueUrl.searchParams.set("select", "id,user_id,title,message,action_url,created_at");
  queueUrl.searchParams.set("order", "created_at.asc");
  queueUrl.searchParams.set("limit", "10");
  let requestedNotificationId: string | null = null;
  try {
    const requestBody = await req.clone().json();
    if (typeof requestBody?.notification_id === "string" && /^[0-9a-f-]{36}$/i.test(requestBody.notification_id)) {
      requestedNotificationId = requestBody.notification_id;
      queueUrl.searchParams.set("id", `eq.${requestedNotificationId}`);
    }
  } catch { /* process the normal queue when no JSON body is supplied */ }

  const queueResponse = await fetch(queueUrl, { headers });
  if (!queueResponse.ok) return json({ error: "Read failed", detail: await queueResponse.text() }, 502);
  const rows = await queueResponse.json();

  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user: username, pass: password },
    connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000,
  });

  let sent = 0;
  let failed = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const item of rows) {
    const claimUrl = new URL("/rest/v1/user_notifications", base);
    claimUrl.searchParams.set("id", `eq.${item.id}`);
    claimUrl.searchParams.set("email_status", "eq.pending");
    claimUrl.searchParams.set("email_attempted_at", "is.null");

    const claim = await fetch(claimUrl, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ email_attempted_at: new Date().toISOString() }),
    });
    const claimText = await claim.text();
    let claimed: unknown[] = [];
    try { claimed = JSON.parse(claimText); } catch { /* handled below */ }
    if (!claim.ok) {
      results.push({ id: item.id, status: "claim_error", detail: claimText.slice(0, 400) });
      continue;
    }
    if (!claimed.length) continue;

    const updateUrl = new URL("/rest/v1/user_notifications", base);
    updateUrl.searchParams.set("id", `eq.${item.id}`);

    try {
      const userResponse = await fetch(new URL(`/auth/v1/admin/users/${item.user_id}`, base), { headers });
      if (!userResponse.ok) throw new Error("Recipient lookup " + userResponse.status + ": " + (await userResponse.text()).slice(0, 200));
      const user = await userResponse.json();
      if (!user.email) throw new Error("Recipient email missing");

      const metadata = user.user_metadata ?? {};
      const recipientName = String(metadata.full_name ?? metadata.name ?? metadata.display_name ?? "there").trim() || "there";
      const title = String(item.title ?? "Ekhaya Price Checker notification");
      const message = String(item.message ?? "");
      const action = item.action_url ? String(item.action_url) : "";
      let safeAction = "";
      if (action) {
        try {
          const parsed = new URL(action, "https://pricechecker.ekhayatech.co.za");
          if (parsed.protocol === "https:" || parsed.protocol === "http:") safeAction = parsed.toString();
        } catch { /* omit invalid action links */ }
      }

      const safeName = escapeHtml(recipientName);
      const safeTitle = escapeHtml(title);
      const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");
      const actionHtml = safeAction
        ? `<tr><td align="center" style="padding:26px 32px 30px"><a href="${escapeHtml(safeAction)}" style="display:inline-block;background:#1769aa;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.3px;padding:14px 26px;border-radius:5px">OPEN PRICE CHECKER</a></td></tr>`
        : "";
      const textBody = `Hello ${recipientName},\n\n${message}${safeAction ? `\n\nOpen Price Checker: ${safeAction}` : ""}\n\nEkhaya Technologies\nDIGITAL SOLUTIONS · BUILT AROUND YOU`;

      await transporter.sendMail({
        from: { name: "Ekhaya Technologies", address: username },
        to: user.email,
        subject: title,
        text: textBody,
        html: `<!doctype html><html><body style="margin:0;padding:0;background:#f2f5f9;font-family:Arial,Helvetica,sans-serif;color:#182b45">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f9;padding:34px 12px"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e3e9f0;border-radius:8px;overflow:hidden">
<tr><td style="background:#10243e;padding:27px 34px 24px">
<div style="font-size:23px;line-height:1.2;font-weight:700;letter-spacing:.5px;color:#ffffff">EKHAYA <span style="color:#70b7ed">TECHNOLOGIES</span></div>
<div style="font-size:10px;letter-spacing:1.7px;color:#c6d5e5;margin-top:8px">DIGITAL SOLUTIONS · BUILT AROUND YOU</div>
</td></tr>
<tr><td style="padding:34px 34px 8px">
<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#1976b9;text-transform:uppercase">EKHAYA PRICE CHECKER</div>
<h1 style="font-size:26px;line-height:1.25;color:#10243e;margin:12px 0 22px;font-weight:700">${safeTitle}</h1>
<p style="font-size:15px;line-height:1.65;color:#30445d;margin:0 0 14px">Hello ${safeName},</p>
<div style="font-size:15px;line-height:1.75;color:#40536a">${safeMessage}</div>
</td></tr>
${actionHtml}
<tr><td style="padding:0 34px 30px"><div style="border-top:1px solid #e8edf3;padding-top:19px;font-size:12px;line-height:1.6;color:#7b8999">You are receiving this message because of activity on your Ekhaya Price Checker account.</div></td></tr>
<tr><td style="background:#edf3f8;padding:20px 34px;text-align:center">
<div style="font-size:13px;font-weight:700;color:#173452">EKHAYA TECHNOLOGIES</div>
<div style="font-size:10px;letter-spacing:1.3px;color:#647b91;margin-top:5px">DIGITAL SOLUTIONS · BUILT AROUND YOU</div>
</td></tr>
</table></td></tr></table></body></html>`,
      });

      const done = await fetch(updateUrl, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null }),
      });
      if (!done.ok) throw new Error("Sent but status update failed: " + (await done.text()).slice(0, 300));
      sent++;
      results.push({ id: item.id, status: "sent" });
    } catch (error) {
      const detail = String(error instanceof Error ? error.message : error).slice(0, 500);
      await fetch(updateUrl, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email_status: "failed", email_error: detail }),
      });
      failed++;
      results.push({ id: item.id, status: "failed", detail });
    }
  }

  try { await transporter.close(); } catch { /* ignore close errors */ }
  return json({ ok: true, processed: sent + failed, sent, failed, results });
});