import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://ekhayatech.co.za",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const plans = {
  starter: { amount: 9900, credits: 50 },
  growth: { amount: 14900, credits: 100 },
  pro: { amount: 19900, credits: 250 },
} as const;

type PlanCode = keyof typeof plans;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha512(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function initialiseCheckout(req: Request) {
  if (Deno.env.get("PAYSTACK_CHECKOUT_ENABLED") !== "true") {
    return json({ error: "Paid checkout is not available yet. Free welcome searches remain available." }, 503);
  }

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const appUrl = Deno.env.get("APP_BASE_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!secret || !appUrl || !supabaseUrl || !anonKey) {
    console.error("Checkout configuration is incomplete.");
    return json({ error: "Checkout is temporarily unavailable." }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || token === authHeader) return json({ error: "Sign in to continue." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user?.id || !authData.user.email) {
    return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);
  }

  const body = await req.json().catch(() => null);
  const planCode = body?.plan as PlanCode;
  if (!planCode || !(planCode in plans)) return json({ error: "Choose a valid subscription plan." }, 400);

  const admin = getAdminClient();
  const userId = authData.user.id;
  const plan = plans[planCode];
  const merchantReference = `EHK-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .insert({
      user_id: userId,
      payment_provider: "paystack",
      plan_code: planCode,
      status: "pending",
      billing_mode: "manual",
      intro_price: plan.amount / 100,
      renewal_amount: plan.amount / 100,
    })
    .select("id")
    .single();
  if (subError || !subscription) {
    console.error("Could not create pending subscription:", subError?.message);
    return json({ error: "We could not prepare your subscription. Please try again." }, 500);
  }

  const { data: transaction, error: txnError } = await admin
    .from("payment_transactions")
    .insert({
      user_id: userId,
      subscription_id: subscription.id,
      payment_provider: "paystack",
      merchant_reference: merchantReference,
      payment_kind: "introductory",
      billing_mode: "manual",
      amount: plan.amount / 100,
      currency: "ZAR",
      status: "created",
      provider_response: { plan_code: planCode, monthly_search_credits: plan.credits },
    })
    .select("id")
    .single();
  if (txnError || !transaction) {
    await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", subscription.id);
    console.error("Could not create payment record:", txnError?.message);
    return json({ error: "We could not prepare your payment. Please try again." }, 500);
  }

  const callbackUrl = new URL("/billing/return/", appUrl).toString();
  const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: authData.user.email,
      amount: plan.amount,
      currency: "ZAR",
      reference: merchantReference,
      callback_url: callbackUrl,
      metadata: {
        user_id: userId,
        subscription_id: subscription.id,
        payment_transaction_id: transaction.id,
        plan_code: planCode,
        monthly_search_credits: plan.credits,
      },
    }),
  });

  const paystack = await paystackResponse.json().catch(() => ({}));
  if (!paystackResponse.ok || paystack.data?.status !== "success" || !paystack.data?.authorization_url) {
    await admin.from("payment_transactions").update({
      status: "failed",
      provider_response: { error: paystack.message ?? "Paystack initialization failed." },
    }).eq("id", transaction.id);
    await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", subscription.id);
    console.error("Paystack initialization failed:", paystack.message);
    return json({ error: "The payment provider could not start checkout. Please try again later." }, 502);
  }

  await admin.from("payment_transactions").update({
    status: "pending",
    provider_response: { reference: merchantReference, access_code: paystack.data.access_code },
  }).eq("id", transaction.id);

  return json({ authorization_url: paystack.data.authorization_url, reference: merchantReference });
}

async function handleWebhook(req: Request) {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret || Deno.env.get("PAYSTACK_CHECKOUT_ENABLED") !== "true") {
    return json({ error: "Webhook processing is not enabled." }, 503);
  }

  const rawBody = await req.text();
  const received = req.headers.get("x-paystack-signature") ?? "";
  const expected = await hmacSha512(secret, rawBody);
  if (!received || !timingSafeEqual(received.toLowerCase(), expected)) {
    return json({ error: "Invalid webhook signature." }, 401);
  }

  const event = JSON.parse(rawBody);
  if (event?.event !== "charge.success" || !event?.data?.reference) return json({ received: true });

  const reference = String(event.data.reference);
  const admin = getAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payment_transactions")
    .select("id,user_id,subscription_id,amount,currency,status,merchant_reference")
    .eq("payment_provider", "paystack")
    .eq("merchant_reference", reference)
    .maybeSingle();
  if (paymentError) {
    console.error("Payment lookup failed:", paymentError.message);
    return json({ error: "Payment lookup failed." }, 500);
  }
  if (!payment) return json({ error: "Unknown payment reference." }, 404);
  if (payment.status === "complete") return json({ received: true, duplicate: true });
  if (!payment.subscription_id) return json({ error: "Payment has no subscription." }, 409);

  // Never trust the event body alone: verify the reference directly with Paystack.
  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const verified = await verifyResponse.json().catch(() => ({}));
  const verifiedData = verified.data;
  const expectedMinor = Math.round(Number(payment.amount) * 100);
  if (
    !verifyResponse.ok ||
    verified.status !== true ||
    verifiedData?.status !== "success" ||
    verifiedData?.currency !== "ZAR" ||
    Number(verifiedData?.amount) !== expectedMinor ||
    verifiedData?.reference !== reference
  ) {
    console.error("Paystack verification did not match expected payment:", reference);
    return json({ error: "Payment could not be verified." }, 409);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .select("id,user_id,plan_code")
    .eq("id", payment.subscription_id)
    .eq("user_id", payment.user_id)
    .maybeSingle();
  if (subError || !subscription) return json({ error: "Subscription record not found." }, 409);

  // Activate the subscription before completing the transaction; the existing
  // database payment trigger allocates the configured search credits on completion.
  const { error: activateError } = await admin.from("subscriptions").update({
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    intro_payment_completed_at: now.toISOString(),
    billing_mode: "manual",
    renewal_amount: payment.amount,
    updated_at: now.toISOString(),
  }).eq("id", subscription.id);
  if (activateError) {
    console.error("Subscription activation failed:", activateError.message);
    return json({ error: "Subscription activation failed." }, 500);
  }

  const { error: profileError } = await admin.from("profiles")
    .update({ plan_code: subscription.plan_code, updated_at: now.toISOString() })
    .eq("id", payment.user_id);
  if (profileError) {
    console.error("Profile plan update failed:", profileError.message);
    return json({ error: "Account plan update failed." }, 500);
  }

  const { error: completeError } = await admin.from("payment_transactions").update({
    status: "complete",
    provider_payment_id: String(verifiedData.id),
    paid_at: verifiedData.paid_at ?? now.toISOString(),
    provider_response: { reference, channel: verifiedData.channel, gateway_response: verifiedData.gateway_response },
    updated_at: now.toISOString(),
  }).eq("id", payment.id).neq("status", "complete");
  if (completeError) {
    console.error("Payment completion failed:", completeError.message);
    return json({ error: "Payment completion failed." }, 500);
  }

  return json({ received: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = new URL(req.url);
  try {
    if (url.pathname.endsWith("/webhook")) return await handleWebhook(req);
    return await initialiseCheckout(req);
  } catch (error) {
    console.error("Billing handler error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Billing service temporarily unavailable." }, 500);
  }
});
