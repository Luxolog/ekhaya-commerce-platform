import { createHash } from "node:crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function md5(value: string) {
  return createHash("md5").update(value, "utf8").digest("hex");
}
function encode(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+").replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
function signature(fields: Record<string, string>, passphrase: string) {
  const pairs = Object.entries(fields).filter(([,v]) => v !== "").map(([k,v]) => `${k}=${encode(v)}`);
  if (passphrase) pairs.push(`passphrase=${encode(passphrase)}`);
  return md5(pairs.join("&"));
}
function credentials(mode: string) {
  const prefix = mode === "live" ? "PAYFAST_LIVE_" : "PAYFAST_SANDBOX_";
  const fallback = (name: string) => mode === "sandbox" ? Deno.env.get(`PAYFAST_${name}`) : undefined;
  const merchantId = Deno.env.get(prefix + "MERCHANT_ID") ?? fallback("MERCHANT_ID");
  const merchantKey = Deno.env.get(prefix + "MERCHANT_KEY") ?? fallback("MERCHANT_KEY");
  const passphrase = Deno.env.get(prefix + "PASSPHRASE") ?? fallback("PASSPHRASE");
  if (!merchantId || !merchantKey || !passphrase) throw new Error(`PayFast ${mode} credentials are not fully configured.`);
  return { merchantId, merchantKey, passphrase };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox").toLowerCase();
    const baseUrl = Deno.env.get("APP_BASE_URL");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase server configuration is incomplete.");
    if (!baseUrl) throw new Error("APP_BASE_URL must be configured before checkout can be enabled.");
    if (!["sandbox", "live"].includes(mode)) throw new Error("PAYFAST_MODE must be sandbox or live.");
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in to continue." }, 401);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: auth },
    });
    if (!userResponse.ok) return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);
    const user = await userResponse.json();
    if (!user?.id || !user?.email) return json({ error: "A verified account email is required for checkout." }, 400);

    const input = await req.json();
    const planCode = String(input?.plan_code ?? "").toLowerCase();
    const billingMode = input?.billing_mode === "automatic" ? "automatic" : "manual";
    const plansResponse = await fetch(
      `${supabaseUrl}/rest/v1/billing_plans?code=eq.${encodeURIComponent(planCode)}&is_active=eq.true&select=code,name,monthly_price,intro_price,currency`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!plansResponse.ok) throw new Error("Unable to load subscription plan.");
    const plans = await plansResponse.json();
    const plan = plans?.[0];
    if (!plan || Number(plan.monthly_price) <= 0) return json({ error: "This subscription plan is unavailable." }, 400);
    if (billingMode === "automatic" && mode === "sandbox" && !Deno.env.get("PAYFAST_SANDBOX_MERCHANT_ID") && !Deno.env.get("PAYFAST_MERCHANT_ID")) {
      return json({ error: "Sandbox recurring billing credentials are not configured." }, 503);
    }
    const activeSubResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(user.id)}&status=in.(pending,active)&select=id,plan_code,status,current_period_end`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!activeSubResponse.ok) throw new Error("Unable to check your current subscription.");
    const activeSubs = await activeSubResponse.json();
    if (activeSubs?.some((sub: { status: string; current_period_end?: string | null }) => sub.status === "pending" || (sub.current_period_end && new Date(sub.current_period_end) > new Date()))) return json({ error: "You already have a pending or active subscription. Please complete or contact support about that subscription before starting another." }, 409);

    const amount = Number(plan.monthly_price);
    const now = new Date();
    const merchantReference = `EKH-${crypto.randomUUID()}`;
    const subPayload = {
      user_id: user.id,
      payment_provider: "payfast",
      plan_code: plan.code,
      status: "pending",
      billing_mode: billingMode,
      intro_price: 0,
      renewal_amount: amount,
    };
    const subResponse = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(subPayload),
    });
    if (!subResponse.ok) throw new Error("Unable to create pending subscription.");
    const subs = await subResponse.json();
    const subscription = subs?.[0];
    if (!subscription?.id) throw new Error("Subscription could not be created.");

    const transactionResponse = await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: user.id, subscription_id: subscription.id, payment_provider: "payfast",
        merchant_reference: merchantReference, payment_kind: "introductory",
        billing_mode: billingMode, amount, currency: plan.currency ?? "ZAR", status: "created",
        provider_response: { mode, plan_code: plan.code },
      }),
    });
    if (!transactionResponse.ok) {
      await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subscription.id}`, {
        method: "DELETE", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      throw new Error("Unable to create payment record.");
    }

    const { merchantId, merchantKey, passphrase } = credentials(mode);
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseUrl.replace(/\/$/, "")}/account/billing?payment=return`,
      cancel_url: `${baseUrl.replace(/\/$/, "")}/account/billing?payment=cancelled`,
      notify_url: `${supabaseUrl}/functions/v1/payfast-itn`,
      name_first: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Ekhaya Customer").slice(0, 100),
      email_address: String(user.email).slice(0, 100),
      m_payment_id: merchantReference,
      amount: amount.toFixed(2),
      item_name: `Ekhaya ${plan.name} monthly subscription`.slice(0, 100),
      item_description: `Ekhaya Price Checker ${plan.name} plan`.slice(0, 255),
    };
    if (billingMode === "automatic") {
      fields.subscription_type = "1";
      fields.billing_date = now.toISOString().slice(0, 10);
      fields.recurring_amount = amount.toFixed(2);
      fields.frequency = "3";
      fields.cycles = "0";
    }
    const signatureValue = signature(fields, passphrase);
    return json({
      mode,
      checkout_url: mode === "live" ? "https://www.payfast.co.za/eng/process" : "https://sandbox.payfast.co.za/eng/process",
      fields: { ...fields, signature: signatureValue },
      subscription_id: subscription.id,
      merchant_reference: merchantReference,
      billing_mode: billingMode,
    });
  } catch (error) {
    console.error("payfast-checkout:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: error instanceof Error ? error.message : "Checkout could not be prepared." }, 400);
  }
});
