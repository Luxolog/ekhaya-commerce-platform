import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://ekhayatech.co.za",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Keep disabled until merchant approval, secrets, webhook registration and acceptance tests are complete.
const MARKETING_CHECKOUT_RELEASE_ENABLED = false;
const MARKETING_PLANS = {
  marketing_mini: { amount: 2900 },
} as const;

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
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function initialiseCheckout(req: Request) {
  if (!MARKETING_CHECKOUT_RELEASE_ENABLED || Deno.env.get("PAYSTACK_MARKETING_CHECKOUT_ENABLED") !== "true") {
    return json({ error: "AI Marketing checkout is not available yet. No payment has been collected." }, 503);
  }

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const appUrl = Deno.env.get("APP_BASE_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!secret || !appUrl || !supabaseUrl || !anonKey) return json({ error: "Checkout is temporarily unavailable." }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\\s+/i, "");
  if (!token || token === authHeader) return json({ error: "Sign in to continue." }, 401);

  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);

  const body = await req.json().catch(() => null);
  const planCode = body?.plan as keyof typeof MARKETING_PLANS;
  if (!planCode || !Object.prototype.hasOwnProperty.call(MARKETING_PLANS, planCode)) return json({ error: "Choose a valid marketing plan." }, 400);

  const admin = adminClient();
  const userId = data.user.id;
  const plan = MARKETING_PLANS[planCode];
  const reference = `EHK-MKT-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;

  const { data: existing, error: existingError } = await admin
    .from("seller_marketing_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (existingError) return json({ error: "Unable to check your existing marketing subscription." }, 500);
  if (existing) return json({ error: "Your AI Marketing subscription is already active." }, 409);

  const { data: subscription, error: subscriptionError } = await admin
    .from("seller_marketing_subscriptions")
    .insert({ user_id: userId, plan_code: planCode, status: "pending", billing_mode: "manual" })
    .select("id")
    .single();
  if (subscriptionError || !subscription) return json({ error: "Unable to prepare your marketing subscription." }, 500);

  const { data: payment, error: paymentError } = await admin
    .from("marketing_payment_transactions")
    .insert({
      user_id: userId,
      marketing_subscription_id: subscription.id,
      payment_provider: "paystack",
      merchant_reference: reference,
      amount: plan.amount / 100,
      currency: "ZAR",
      status: "created",
      provider_response: { plan_code: planCode, billing_mode: "manual" },
    })
    .select("id")
    .single();
  if (paymentError || !payment) {
    await admin.from("seller_marketing_subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", subscription.id);
    return json({ error: "Unable to prepare your marketing payment." }, 500);
  }

  const callbackUrl = new URL("/account/marketing/?payment=return", appUrl).toString();
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.user.email,
      amount: plan.amount,
      currency: "ZAR",
      reference,
      callback_url: callbackUrl,
      metadata: { user_id: userId, marketing_subscription_id: subscription.id, marketing_payment_id: payment.id, plan_code: planCode },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.data?.status !== "success" || !payload.data?.authorization_url) {
    await admin.from("marketing_payment_transactions").update({ status: "failed", provider_response: { error: payload.message ?? "Paystack initialization failed." } }).eq("id", payment.id);
    await admin.from("seller_marketing_subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", subscription.id);
    return json({ error: "The payment provider could not start checkout. Please try again later." }, 502);
  }

  await admin.from("marketing_payment_transactions").update({
    status: "pending",
    provider_response: { reference, access_code: payload.data.access_code, plan_code: planCode },
  }).eq("id", payment.id);

  return json({ authorization_url: payload.data.authorization_url, reference });
}

async function handleWebhook(req: Request) {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const webhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
  if (!MARKETING_CHECKOUT_RELEASE_ENABLED || !secret || Deno.env.get("PAYSTACK_MARKETING_CHECKOUT_ENABLED") !== "true") {
    return json({ error: "AI Marketing webhook processing is not enabled." }, 503);
  }

  const rawBody = await req.text();
  const modern = req.headers.get("paystack-signature") ?? "";
  const legacy = req.headers.get("x-paystack-signature") ?? "";
  let valid = false;

  if (modern && webhookSecret) {
    const parts = modern.split(",").map((part) => part.trim());
    const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
    const seconds = Number(timestamp);
    if (timestamp && Number.isFinite(seconds) && Math.abs(Date.now() / 1000 - seconds) <= 300) {
      const candidates = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
      const expected = await hmacSha512(webhookSecret, `${timestamp}.${rawBody}`);
      valid = candidates.some((candidate) => {
        const signature = candidate.includes(":") ? candidate.slice(candidate.indexOf(":") + 1) : candidate;
        return /^[0-9a-f]{128}$/i.test(signature) && timingSafeEqual(signature.toLowerCase(), expected);
      });
    }
  }
  if (!valid && legacy && /^[0-9a-f]{128}$/i.test(legacy)) {
    valid = timingSafeEqual(legacy.toLowerCase(), await hmacSha512(secret, rawBody));
  }
  if (!valid) return json({ error: "Invalid webhook signature." }, 401);

  let event: Record<string, any>;
  try { event = JSON.parse(rawBody); } catch { return json({ error: "Invalid webhook payload." }, 400); }
  if (event?.event !== "charge.success" || !event?.data?.reference) return json({ received: true });

  const reference = String(event.data.reference);
  const admin = adminClient();
  const { data: payment, error } = await admin.from("marketing_payment_transactions")
    .select("id,user_id,marketing_subscription_id,amount,currency,status,merchant_reference")
    .eq("merchant_reference", reference)
    .maybeSingle();
  if (error) return json({ error: "Payment lookup failed." }, 500);
  if (!payment) return json({ error: "Unknown marketing payment reference." }, 404);
  if (payment.status === "complete") return json({ received: true, duplicate: true });
  if (!payment.marketing_subscription_id) return json({ error: "Payment has no marketing subscription." }, 409);

  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const verified = await verifyResponse.json().catch(() => ({}));
  const details = verified.data;
  if (
    !verifyResponse.ok || verified.status !== true || details?.status !== "success" ||
    details?.currency !== "ZAR" || Number(details?.amount) !== Math.round(Number(payment.amount) * 100) ||
    details?.reference !== reference
  ) return json({ error: "Payment could not be verified." }, 409);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const { data: subscription, error: subscriptionError } = await admin.from("seller_marketing_subscriptions")
    .select("id,user_id,status")
    .eq("id", payment.marketing_subscription_id)
    .eq("user_id", payment.user_id)
    .maybeSingle();
  if (subscriptionError || !subscription) return json({ error: "Marketing subscription record not found." }, 409);
  if (subscription.status === "cancelled" || subscription.status === "expired") return json({ error: "Marketing subscription is no longer eligible for activation." }, 409);

  const { error: activateError } = await admin.from("seller_marketing_subscriptions").update({
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    billing_mode: "manual",
    updated_at: now.toISOString(),
  }).eq("id", subscription.id).eq("status", "pending");
  if (activateError) return json({ error: "Marketing subscription activation failed." }, 500);

  const { error: completeError } = await admin.from("marketing_payment_transactions").update({
    status: "complete",
    provider_transaction_id: String(details.id),
    paid_at: details.paid_at ?? now.toISOString(),
    provider_response: { reference, channel: details.channel, gateway_response: details.gateway_response },
    updated_at: now.toISOString(),
  }).eq("id", payment.id).neq("status", "complete");
  if (completeError) return json({ error: "Marketing payment completion failed." }, 500);
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
    console.error("AI Marketing billing error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "AI Marketing billing service temporarily unavailable." }, 500);
  }
});
