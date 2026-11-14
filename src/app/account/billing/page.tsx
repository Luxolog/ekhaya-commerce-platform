"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
type Plan = { code: string; name: string; monthly_price: number; currency: string; display_order: number };
type Session = { access_token: string; refresh_token?: string; expires_at?: number; expires_in?: number };

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [billingMode, setBillingMode] = useState<"manual" | "automatic">("manual");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ekhaya_session");
      if (raw) setSession(JSON.parse(raw));
    } catch { localStorage.removeItem("ekhaya_session"); }
    fetch(supabaseUrl + "/rest/v1/billing_plans?is_active=eq.true&select=code,name,monthly_price,currency,display_order&order=display_order.asc", {
      headers: { apikey: anonKey },
    }).then(async response => {
      if (!response.ok) throw new Error("Unable to load subscription plans.");
      setPlans(await response.json());
    }).catch(error => setMessage(error instanceof Error ? error.message : "Unable to load plans."))
      .finally(() => setLoading(false));
  }, []);

  async function authHeaders() {
    if (!session?.access_token) throw new Error("Please sign in before choosing a subscription.");
    let current = session;
    if (current.expires_at && current.expires_at < Date.now() + 60000) {
      if (!current.refresh_token) throw new Error("Your session has expired. Please sign in again.");
      const refresh = await fetch(supabaseUrl + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST", headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      const next = await refresh.json();
      if (!refresh.ok || !next.access_token) throw new Error("Your session has expired. Please sign in again.");
      current = { ...next, expires_at: Date.now() + Number(next.expires_in ?? 3600) * 1000 };
      localStorage.setItem("ekhaya_session", JSON.stringify(current));
      setSession(current);
    }
    return { "Content-Type": "application/json", apikey: anonKey, Authorization: "Bearer " + current.access_token };
  }

  async function checkout(plan: Plan) {
    setBusy(plan.code); setMessage("");
    try {
      const headers = await authHeaders();
      const response = await fetch(supabaseUrl + "/functions/v1/payfast-checkout", {
        method: "POST", headers, body: JSON.stringify({ plan_code: plan.code, billing_mode: billingMode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not prepare checkout.");
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.checkout_url;
      form.style.display = "none";
      for (const [name, value] of Object.entries(data.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = name; input.value = String(value);
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be started.");
      setBusy("");
    }
  }

  const money = (value: number, currency: string) => new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(value);
  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "28px 5%", fontFamily: "Arial,sans-serif" }}>
    <header style={{ maxWidth: 1000, margin: "0 auto 38px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/" style={{ color: "#079BD3", fontWeight: 800, textDecoration: "none" }}>EKHAYA TECHNOLOGIES</Link>
      <Link href="/price-checker/" style={{ color: "#079BD3", fontWeight: 700 }}>Back to Price Checker →</Link>
    </header>
    <section style={{ maxWidth: 1000, margin: "0 auto" }}>
      <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>SELLER SUBSCRIPTIONS</p>
      <h1 style={{ fontSize: 38, margin: "8px 0" }}>Choose your plan</h1>
      <p style={{ color: "#60758A", lineHeight: 1.6 }}>Select a monthly plan for your marketplace price intelligence tools.</p>
      <div style={{ margin: "24px 0", padding: 18, background: "#fff", border: "1px solid #DCE8F1", borderRadius: 12 }}>
        <strong>How would you like to renew?</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          <button onClick={() => setBillingMode("manual")} style={modeStyle(billingMode === "manual")}>Manual monthly renewal</button>
          <button onClick={() => setBillingMode("automatic")} style={modeStyle(billingMode === "automatic")}>Automatic card renewal</button>
        </div>
        <p style={{ color: "#60758A", fontSize: 12, lineHeight: 1.5, marginBottom: 0 }}>
          {billingMode === "manual" ? "You will pay each month when renewing. This supports the payment methods available on your PayFast checkout." : "PayFast recurring billing requires a supported credit card. The card is charged automatically each month until cancelled."}
        </p>
      </div>
      {!session && <p style={{ background: "#FFF7E6", padding: 14, borderRadius: 8 }}>Please <Link href="/account/">sign in to your seller account</Link> before subscribing.</p>}
      {message && <p role="status" style={{ background: "#FFF7E6", padding: 14, borderRadius: 8 }}>{message}</p>}
      {loading ? <p>Loading plans…</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        {plans.map(plan => <article key={plan.code} style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 22 }}>
          <p style={{ color: "#079BD3", fontWeight: 800, fontSize: 11, letterSpacing: 1.5 }}>{plan.name.toUpperCase()}</p>
          <h2 style={{ fontSize: 32, margin: "10px 0" }}>{money(Number(plan.monthly_price), plan.currency)}<span style={{ fontSize: 13, color: "#60758A", fontWeight: 400 }}>/month</span></h2>
          <p style={{ color: "#60758A", fontSize: 13 }}>Monthly subscription · {billingMode === "manual" ? "Manual renewal" : "Automatic card renewal"}</p>
          <button disabled={!session || !!busy} onClick={() => checkout(plan)} style={{ width: "100%", marginTop: 16, padding: 13, border: 0, borderRadius: 8, background: "#079BD3", color: "#fff", fontWeight: 800, cursor: !session || busy ? "not-allowed" : "pointer", opacity: !session || busy ? .55 : 1 }}>
            {busy === plan.code ? "Preparing checkout…" : "Continue to PayFast"}
          </button>
        </article>)}
      </div>}
      <p style={{ color: "#71869A", fontSize: 11, lineHeight: 1.6, marginTop: 24 }}>Payments are processed securely by PayFast. Your subscription is activated only after the server verifies the payment notification. Automatic renewal is available for supported card payments only.</p>
    </section>
  </main>;
}
function modeStyle(active: boolean): React.CSSProperties {
  return { padding: "11px 15px", borderRadius: 8, border: active ? "2px solid #079BD3" : "1px solid #DCE8F1", background: active ? "#EAF7FC" : "#fff", color: "#071B31", fontWeight: 700, cursor: "pointer" };
}
