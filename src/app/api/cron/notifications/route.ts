import { createConnection, type TLSSocket } from "node:tls";

export const runtime = "nodejs";
export const maxDuration = 60;

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  action_url: string | null;
};

type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
type Profile = { id: string; display_name?: string | null };

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function supabaseRequest(path: string, method = "GET", body?: unknown, prefer?: string) {
  const base = required("SUPABASE_URL").replace(/\/$/, "");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${raw.slice(0, 500)}`);
  return raw ? JSON.parse(raw) : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function renderEmail(title: string, message: string, action: string): { html: string; text: string } {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const safeAction = action ? escapeHtml(action) : "";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#10243b">
  <div style="max-width:900px;margin:0 auto;background:#fff;border-left:1px solid #dce6ef;border-right:1px solid #dce6ef">
    <header style="padding:27px 54px 30px;border-bottom:1px solid #dce6ef;background:#fff">
      <div style="font-size:22px;line-height:1.3;letter-spacing:2px;font-weight:800;color:#10243b"><span style="color:#079bd3">EKHAYA</span> TECHNOLOGIES</div>
      <div style="margin-top:8px;font-size:14px;letter-spacing:2px;color:#7188a3">DIGITAL SOLUTIONS · BUILT AROUND YOU</div>
    </header>
    <main style="padding:52px 54px 48px">
      <div style="font-size:16px;letter-spacing:3px;font-weight:700;color:#079bd3;text-transform:uppercase;margin-bottom:22px">EKHAYA PRICE CHECKER</div>
      <h1 style="font-size:42px;line-height:1.15;font-weight:700;color:#10243b;margin:0 0 22px">${safeTitle}</h1>
      <div style="font-size:18px;line-height:1.8;color:#536b84">${safeMessage}</div>
      ${safeAction ? `<p style="margin:42px 0 38px"><a href="${safeAction}" style="display:inline-block;background:#079bd3;color:#fff;padding:23px 38px;text-decoration:none;border-radius:12px;font-size:18px;font-weight:700">Open Ekhaya Price Checker</a></p>` : ""}
      <div style="margin-top:42px;font-size:15px;line-height:1.8;color:#7188a3">For your security, do not share private account links or payment information with anyone.</div>
    </main>
    <footer style="padding:24px 54px;border-top:1px solid #dce6ef;background:#fff;color:#7188a3;font-size:13px;line-height:1.7">Ekhaya Price Checker · An Ekhaya Technologies Product<br><strong style="color:#10243b">Know the numbers before you invest.</strong><br>Buy smarter. Sell smarter. Grow with confidence.</footer>
  </div></body></html>`;
  return { html, text: message + (action ? `\n\n${action}` : "") };
}

function readReply(socket: TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    const onData = (chunk: Buffer) => {
      data += chunk.toString("utf8");
      const lines = data.split("\r\n").filter(Boolean);
      const last = lines.at(-1) ?? "";
      if (/^\d{3} /.test(last)) {
        cleanup();
        resolve(data);
      }
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function smtpCommand(socket: TLSSocket, command: string, expected: number[]) {
  const reply = readReply(socket);
  socket.write(command + "\r\n");
  const response = await reply;
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) throw new Error(`SMTP error: ${response.trim().slice(0, 300)}`);
}

async function sendSmtp(to: string, subject: string, textBody: string, htmlBody: string) {
  const host = required("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || "465");
  const user = required("SMTP_USER");
  const password = required("SMTP_PASSWORD");
  const fromName = process.env.EMAIL_FROM_NAME || "Ekhaya Price Checker";
  const socket = createConnection({ host, port, servername: host });
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.setTimeout(20000, () => reject(new Error("SMTP connection timed out")));
  });
  try {
    await readReply(socket);
    await smtpCommand(socket, "EHLO ekhayatech.co.za", [250]);
    await smtpCommand(socket, "AUTH LOGIN", [334]);
    await smtpCommand(socket, Buffer.from(user).toString("base64"), [334]);
    await smtpCommand(socket, Buffer.from(password).toString("base64"), [235]);
    await smtpCommand(socket, `MAIL FROM:<${user}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await smtpCommand(socket, "DATA", [354]);
    const boundary = `ekhaya_${crypto.randomUUID().replace(/-/g, "")}`;
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const encodedFrom = `=?UTF-8?B?${Buffer.from(fromName).toString("base64")}?=`;
    const message = [
      `From: ${encodedFrom} <${user}>`, `To: <${to}>`, `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
      `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
      Buffer.from(textBody).toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "",
      `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
      Buffer.from(htmlBody).toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "",
      `--${boundary}--`, "",
    ].join("\r\n").replace(/(^|\r\n)\./g, "$1..");
    const finalReply = readReply(socket);
    socket.write(message + "\r\n.\r\n");
    const accepted = await finalReply;
    if (!accepted.startsWith("250")) throw new Error(`SMTP delivery rejected: ${accepted.trim().slice(0, 300)}`);
    await smtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pending = await supabaseRequest(
      "/rest/v1/user_notifications?email_status=eq.pending&select=id,user_id,title,message,action_url,created_at&order=created_at.asc&limit=25",
    ) as Notification[];
    if (!pending.length) return Response.json({ ok: true, sent: 0, failed: 0, message: "No pending emails." });

    const authPayload = await supabaseRequest("/auth/v1/admin/users?page=1&per_page=1000");
    const users = (Array.isArray(authPayload) ? authPayload : authPayload.users ?? []) as AuthUser[];
    const emailById = new Map(users.filter((user) => user.email).map((user) => [user.id, user.email!]));
    const nameById = new Map(users.map((user) => {
      const meta = user.user_metadata ?? {};
      return [user.id, String(meta.display_name ?? meta.full_name ?? meta.name ?? "")];
    }));
    const profiles = await supabaseRequest("/rest/v1/profiles?select=id,display_name") as Profile[];
    for (const profile of profiles) if (profile.display_name) nameById.set(profile.id, profile.display_name);

    let sent = 0;
    let failed = 0;
    for (const item of pending) {
      const recipient = emailById.get(item.user_id);
      if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        await supabaseRequest(`/rest/v1/user_notifications?id=eq.${encodeURIComponent(item.id)}`, "PATCH",
          { email_status: "skipped", email_error: "No valid email address found for this account." });
        continue;
      }
      const claimed = await supabaseRequest(
        `/rest/v1/user_notifications?id=eq.${encodeURIComponent(item.id)}&email_status=eq.pending&select=id`,
        "PATCH", { email_status: "failed", email_error: "Delivery attempt in progress." }, "return=representation",
      ) as Array<{ id: string }>;
      if (!claimed?.length) continue;

      try {
        const name = nameById.get(item.user_id)?.trim() || "there";
        const body = /^\s*Hi\s+/i.test(item.message) ? item.message : `Hi ${name},\n\n${item.message}`;
        const action = item.action_url && item.action_url.startsWith("https://") ? item.action_url : "";
        const rendered = renderEmail(item.title, body, action);
        await sendSmtp(recipient, item.title, rendered.text, rendered.html);
        await supabaseRequest(`/rest/v1/user_notifications?id=eq.${encodeURIComponent(item.id)}`, "PATCH",
          { email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null });
        sent++;
      } catch (error) {
        await supabaseRequest(`/rest/v1/user_notifications?id=eq.${encodeURIComponent(item.id)}`, "PATCH",
          { email_status: "pending", email_error: String(error).slice(0, 500) });
        failed++;
      }
    }
    return Response.json({ ok: true, sent, failed });
  } catch (error) {
    return Response.json({ error: String(error).slice(0, 500) }, { status: 500 });
  }
}
