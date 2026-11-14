import { createHash } from "node:crypto";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function encode(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+").replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
function md5(value: string) {
  return createHash("md5").update(value, "utf8").digest("hex");
}
function credentials(mode: string) {
  const prefix = mode === "live" ? "PAYFAST_LIVE_" : "PAYFAST_SANDBOX_";
  const fallback = (name: string) => mode === "sandbox" ? Deno.env.get(`PAYFAST_${name}`) : undefined;
  const merchantId = Deno.env.get(prefix + "MERCHANT_ID") ?? fallback("MERCHANT_ID");
  const merchantKey = Deno.env.get(prefix + "MERCHANT_KEY") ?? fallback("MERCHANT_KEY");
  const passphrase = Deno.env.get(prefix + "PASSPHRASE") ?? fallback("PASSPHRASE");
  if (!merchantId || !merchantKey || !passphrase) throw new Error("PayFast credentials are not configured.");
  return { merchantId, merchantKey, passphrase };
}
function verifySignature(params: URLSearchParams, passphrase: string) {
  const received = params.get("signature") ?? "";
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "signature") continue;
    pairs.push(`${key}=${encode(value.trim())}`);
  }
  if (passphrase) pairs.push(`passphrase=${encode(passphrase)}`);
  return received.length === 32 && md5(pairs.join("&")) === received.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox").toLowerCase();
    if (!["sandbox", "live"].includes(mode)) return new Response("Invalid payment mode", { status: 500 });
    const { merchantId, passphrase } = credentials(mode);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase server configuration is incomplete.");

    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    if (!verifySignature(params, passphrase)) return new Response("Invalid signature", { status: 400 });
    if (params.get("merchant_id") !== merchantId) return new Response("Invalid merchant", { status: 400 });
    if (params.get("payment_status") !== "COMPLETE") return new Response("Payment not complete", { status: 200 });

    const validateUrl = mode === "live"
      ? "https://www.payfast.co.za/eng/query/validate"
      : "https://sandbox.payfast.co.za/eng/query/validate";
    const validation = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const validationText = (await validation.text()).trim();
    if (!validation.ok || validationText !== "VALID") return new Response("PayFast validation failed", { status: 400 });

    const reference = params.get("m_payment_id");
    const paymentId = params.get("pf_payment_id");
    const gross = Number(params.get("amount_gross"));
    if (!reference || !paymentId || !Number.isFinite(gross)) return new Response("Missing payment fields", { status: 400 });

    const txResponse = await fetch(
      `${supabaseUrl}/rest/v1/payment_transactions?merchant_reference=eq.${encodeURIComponent(reference)}&select=id,user_id,subscription_id,amount,status,payment_kind`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!txResponse.ok) throw new Error("Unable to locate payment transaction.");
    const rows = await txResponse.json();
    const tx = rows?.[0];
    if (!tx) return new Response("Unknown merchant reference", { status: 404 });
    if (Math.abs(Number(tx.amount) - gross) > 0.01) return new Response("Amount mismatch", { status: 400 });
    if (tx.status === "complete") return new Response("OK", { status: 200 });

    const now = new Date();
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const updateTx = await fetch(`${supabaseUrl}/rest/v1/payment_transactions?id=eq.${tx.id}&status=neq.complete`, {
      method: "PATCH",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        provider_payment_id: paymentId,
        status: "complete",
        paid_at: now.toISOString(),
        provider_response: Object.fromEntries(params.entries()),
      }),
    });
    if (!updateTx.ok) throw new Error("Unable to record completed payment.");

    if (tx.subscription_id) {
      const subResponse = await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${tx.subscription_id}&select=id,user_id,plan_code,billing_mode`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const subs = await subResponse.json();
      const sub = subs?.[0];
      if (sub) {
        const subPatch: Record<string, unknown> = {
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          intro_payment_completed_at: now.toISOString(),
        };
        const token = params.get("token");
        if (token) subPatch.provider_subscription_id = token;
        const saved = await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: "PATCH",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(subPatch),
        });
        if (!saved.ok) throw new Error("Unable to activate subscription.");
        const profile = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${sub.user_id}`, {
          method: "PATCH",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ plan_code: sub.plan_code }),
        });
        if (!profile.ok) throw new Error("Unable to update customer plan.");
      }
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("payfast-itn:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Notification processing failed" }, 500);
  }
});
