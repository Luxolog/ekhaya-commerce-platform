"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const plans = [
  { code: "starter", name: "Starter", monthly: 99, description: "For sellers getting started", features: ["Core price comparisons", "Profit and fee estimates", "Standard search allowance"] },
  { code: "growth", name: "Growth", monthly: 149, description: "For sellers building momentum", features: ["Everything in Starter", "Higher search allowance", "More room to research"] },
  { code: "pro", name: "Pro", monthly: 199, description: "For active marketplace sellers", features: ["Everything in Growth", "Expanded research allowance", "Priority access to new tools"] },
  { code: "business", name: "Business", monthly: 299, description: "For established selling operations", features: ["Everything in Pro", "Highest plan allowance", "Built for growing teams"] },
] as const;

function nextMonthlyDate() {
  const date = new Date();
  const day = date.getDate();
  date.setMonth(date.getMonth() + 1);
  if (date.getDate() < day) date.setDate(0);
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function PricingPage() {
  const [selected, setSelected] = useState<(typeof plans)[number]["code"]>("starter");
  const [billingMode, setBillingMode] = useState<"automatic" | "manual">("manual");
  const plan = useMemo(() => plans.find((item) => item.code === selected)!, [selected]);
  const renewalDate = useMemo(() => nextMonthlyDate(), []);

  return (
    <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "32px 5% 70px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ maxWidth: 1120, margin: "0 auto 42px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <Link href="/" style={{ color: "#071B31", fontWeight: 800, textDecoration: "none" }}>EKHAYA TECHNOLOGIES</Link>
        <Link href="/account/" style={{ color: "#079BD3", fontWeight: 700, textDecoration: "none" }}>My account →</Link>
      </header>
      <section style={{ maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>SIMPLE, TRANSPARENT PRICING</p>
        <h1 style={{ fontSize: "clamp(34px, 5vw, 54px)", margin: "10px 0", letterSpacing: -1.5 }}>Choose the plan that moves your business forward.</h1>
        <p style={{ color: "#60758A", lineHeight: 1.7, maxWidth: 700 }}>Start with a once-off introductory payment of R49 for your first month. From the following month, your selected plan renews at its published monthly price.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 28 }}>
          {plans.map((item) => (
            <button key={item.code} onClick={() => setSelected(item.code)} aria-pressed={selected === item.code} style={{ textAlign: "left", padding: 20, borderRadius: 12, border: selected === item.code ? "2px solid #079BD3" : "1px solid #DCE8F1", background: "#fff", color: "#071B31", cursor: "pointer", boxShadow: selected === item.code ? "0 8px 24px #079bd31a" : "none" }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{item.name}</span>
              <span style={{ display: "block", color: "#60758A", fontSize: 12, marginTop: 5 }}>{item.description}</span>
              <span style={{ display: "block", fontSize: 30, fontWeight: 800, marginTop: 18 }}>R{item.monthly}<small style={{ fontSize: 12, color: "#60758A", fontWeight: 500 }}>/month</small></span>
              <span style={{ display: "block", fontSize: 12, color: "#079BD3", fontWeight: 700, marginTop: 8 }}>R49 first month</span>
              <ul style={{ paddingLeft: 18, color: "#60758A", fontSize: 12, lineHeight: 1.9, marginTop: 14 }}>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <span style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 800, color: selected === item.code ? "#079BD3" : "#60758A" }}>{selected === item.code ? "✓ SELECTED" : "SELECT PLAN"}</span>
            </button>
          ))}
        </div>

        <section style={{ marginTop: 28, background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: "clamp(20px, 4vw, 32px)", maxWidth: 760 }}>
          <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>Review your checkout</h2>
          <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>Your renewal amount and payment method are shown below before you continue.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "14px 0", borderTop: "1px solid #E8EFF5" }}>
            <span>Today · {plan.name} introductory payment</span><strong>R49.00</strong>
            <span style={{ color: "#60758A" }}>Next payment · {renewalDate}</span><strong>R{plan.monthly.toFixed(2)}</strong>
            <span style={{ color: "#60758A" }}>Following renewals</span><strong>R{plan.monthly.toFixed(2)} / month</strong>
          </div>
          <h3 style={{ fontSize: 15, margin: "18px 0 10px" }}>How would you like to renew?</h3>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 13, border: billingMode === "manual" ? "2px solid #079BD3" : "1px solid #DCE8F1", borderRadius: 9, marginBottom: 9, cursor: "pointer" }}>
            <input type="radio" name="billing-mode" checked={billingMode === "manual"} onChange={() => setBillingMode("manual")} style={{ marginTop: 3 }} />
            <span><strong>Pay manually every month</strong><span style={{ display: "block", color: "#60758A", fontSize: 12, lineHeight: 1.6, marginTop: 3 }}>No automatic deductions. We will send a renewal reminder and a secure payment link before your plan expires.</span></span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 13, border: billingMode === "automatic" ? "2px solid #079BD3" : "1px solid #DCE8F1", borderRadius: 9, cursor: "pointer" }}>
            <input type="radio" name="billing-mode" checked={billingMode === "automatic"} onChange={() => setBillingMode("automatic")} style={{ marginTop: 3 }} />
            <span><strong>Automatic monthly renewal</strong><span style={{ display: "block", color: "#60758A", fontSize: 12, lineHeight: 1.6, marginTop: 3 }}>After the R49 introductory payment, R{plan.monthly.toFixed(2)} will be charged automatically each month until you cancel.</span></span>
          </label>
          <div style={{ marginTop: 18, padding: 14, borderRadius: 9, background: "#F4F8FC", color: "#405A70", fontSize: 12, lineHeight: 1.7 }}>
            <strong>Before you confirm:</strong> You will pay R49.00 today. Your first renewal is R{plan.monthly.toFixed(2)} on {renewalDate}, then R{plan.monthly.toFixed(2)} every month. {billingMode === "manual" ? "No recurring debit authority will be created. You must make each renewal payment yourself." : "You are authorising automatic monthly payments. You can cancel future renewals from your account."}
          </div>
          <button disabled style={{ width: "100%", marginTop: 18, padding: 15, border: 0, borderRadius: 8, background: "#079BD3", color: "#fff", fontWeight: 800, opacity: .55, cursor: "not-allowed" }}>Continue to secure payment · Coming after PayFast setup</button>
          <p style={{ color: "#71869A", fontSize: 10, lineHeight: 1.6, marginBottom: 0 }}>This checkout preview does not collect payment yet. Payment processing will be enabled after the PayFast merchant account, recurring-payment configuration and secure server callbacks are verified.</p>
        </section>
      </section>
    </main>
  );
}
