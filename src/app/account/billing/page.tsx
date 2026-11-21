"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Session = { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number; [key: string]: unknown };
type Subscription = { id: string; plan_code: string; status: string; billing_mode?: string; current_period_start?: string | null; current_period_end?: string | null; renewal_amount?: number | null; created_at: string };
type Allocation = { credits_allocated: number; credits_available: number; credits_reserved: number; credits_consumed: number; allocated_at: string };
type Payment = { id: string; amount: number; currency: string; status: string; paid_at?: string | null; created_at: string; payment_provider: string; merchant_reference?: string | null };
type Usage = { usage_date: string; product_searches: number; live_refreshes: number; cache_hits: number };
type Profile = { display_name?: string | null; plan_code?: string | null; account_status?: string | null };

const plans = [
  { code: "starter", name: "Starter", price: 99, credits: 50, description: "For sellers getting started with regular product research.", featured: false },
  { code: "growth", name: "Growth", price: 149, credits: 100, description: "For active sellers comparing more products as their catalogue grows.", featured: true },
  { code: "pro", name: "Pro", price: 199, credits: 250, description: "For high-volume sellers who need a larger monthly comparison allowance.", featured: false },
] as const;
const label = (value?: string | null) => value ? value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";
const zar = (value: number, currency = "ZAR") => new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "—";

export default function BillingDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");

  const getHeaders = useCallback(async () => {
    if (!ANON_KEY) throw new Error("Account services are not configured. Please contact Ekhaya support.");
    let current: Session | null = null;
    try {
      const raw = localStorage.getItem("ekhaya_session");
      current = raw ? JSON.parse(raw) as Session : null;
    } catch {
      localStorage.removeItem("ekhaya_session");
    }
    if (!current?.access_token || !current.refresh_token) throw new Error("Sign in to view your billing dashboard.");
    if (Number(current.expires_at) > Date.now() / 1000 + 60) {
      return { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${current.access_token}` };
    }
    const refreshed = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    const payload = await refreshed.json().catch(() => ({}));
    if (!refreshed.ok || typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
      localStorage.removeItem("ekhaya_session");
      throw new Error("Your seller sign-in has expired. Please sign in again.");
    }
    const next: Session = { ...current, ...payload, expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in ?? 3600) };
    localStorage.setItem("ekhaya_session", JSON.stringify(next));
    return { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${payload.access_token}` };
  }, []);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await getHeaders();
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthDate = monthStart.toISOString().slice(0, 10);
      const get = async <T,>(path: string): Promise<T[]> => {
        const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers, cache: "no-store" });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error(body.message ?? body.msg ?? "Unable to load billing information.");
        return body as T[];
      };
      const [profiles, subs, credits, txns, daily] = await Promise.all([
        get<Profile>("profiles?select=display_name,plan_code,account_status&limit=1"),
        get<Subscription>("subscriptions?select=id,plan_code,status,billing_mode,current_period_start,current_period_end,renewal_amount,created_at&order=created_at.desc&limit=10"),
        get<Allocation>("search_credit_allocations?select=credits_allocated,credits_available,credits_reserved,credits_consumed,allocated_at&order=allocated_at.desc&limit=100"),
        get<Payment>("payment_transactions?select=id,amount,currency,status,paid_at,created_at,payment_provider,merchant_reference&order=created_at.desc&limit=10"),
        get<Usage>("user_daily_usage?select=usage_date,product_searches,live_refreshes,cache_hits&usage_date=gte." + monthDate + "&order=usage_date.desc&limit=40"),
      ]);
      setProfile(profiles[0] ?? null);
      setSubscriptions(subs);
      setAllocations(credits);
      setPayments(txns);
      setUsage(daily);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load billing information.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    const requestedPlan = new URLSearchParams(window.location.search).get("plan") ?? "";
    if (plans.some(plan => plan.code === requestedPlan)) setSelectedPlan(requestedPlan);
    void loadBilling();
  }, [loadBilling]);

  const currentSubscription = subscriptions.find(s => s.status === "active") ?? subscriptions[0] ?? null;
  const currentPlan = plans.find(p => p.code === (currentSubscription?.plan_code ?? profile?.plan_code));
  const creditTotals = useMemo(() => allocations.reduce((totals, item) => ({
    allocated: totals.allocated + (Number(item.credits_allocated) || 0),
    available: totals.available + (Number(item.credits_available) || 0),
    reserved: totals.reserved + (Number(item.credits_reserved) || 0),
    consumed: totals.consumed + (Number(item.credits_consumed) || 0),
  }), { allocated: 0, available: 0, reserved: 0, consumed: 0 }), [allocations]);
  const monthlySearches = usage.reduce((sum, item) => sum + (Number(item.product_searches) || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todaySearches = usage.find(item => item.usage_date === today)?.product_searches ?? 0;
  const selected = plans.find(plan => plan.code === selectedPlan);
  const currentPlanLabel = currentPlan?.name ?? (profile?.plan_code ? label(profile.plan_code) : "Free access");

  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "24px clamp(18px,5vw,72px) 64px" }}>
    <header style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={150} style={{ width: 150, height: "auto" }} priority /></Link>
      <nav style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
        <Link href="/price-checker/" style={{ color: "#60758A" }}>Price Checker</Link>
        <Link href="/account/marketing/" style={{ color: "#079BD3" }}>AI Marketing</Link>
        <Link href="/pricing/" style={{ color: "#60758A" }}>Plans & pricing</Link>
        <Link href="/account/" style={{ color: "#079BD3" }}>My account</Link>
      </nav>
    </header>

    <section style={{ maxWidth: 1180, margin: "48px auto 28px" }}>
      <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>EKHAYA PRICE CHECKER · SELLER BILLING</p>
      <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(34px,5vw,52px)", letterSpacing: "-.045em", margin: "10px 0" }}>Your subscription & usage</h1>
      <p style={{ color: "#60758A", lineHeight: 1.7, margin: 0 }}>Review your plan, search allowance, usage and payment history in one place.</p>
    </section>

    {error && <div role="alert" style={{ maxWidth: 1180, margin: "0 auto 20px", padding: 16, borderRadius: 10, background: "#FFF4E8", color: "#79410B", border: "1px solid #F2D4B5" }}>{error} {error.includes("Sign in") || error.includes("expired") ? <Link href="/account/" style={{ fontWeight: 800, textDecoration: "underline" }}>Sign in</Link> : null}</div>}

    <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))", gap: 14 }}>
      {[
        ["CURRENT PLAN", currentPlanLabel, currentSubscription ? label(currentSubscription.status) : "No paid subscription"],
        ["SEARCH CREDITS AVAILABLE", creditTotals.available.toLocaleString("en-ZA"), "Credits currently available on your account"],
        ["SEARCHES USED THIS MONTH", monthlySearches.toLocaleString("en-ZA"), "Based on daily account usage"],
        ["SEARCHES TODAY", Number(todaySearches).toLocaleString("en-ZA"), "Successful product searches"],
      ].map(([heading, value, note]) => <article key={heading} style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 22 }}>
        <p style={{ color: "#60758A", fontSize: 10, letterSpacing: 1.2, fontWeight: 800, margin: "0 0 12px" }}>{heading}</p>
        <strong style={{ display: "block", fontFamily: "Manrope,sans-serif", fontSize: 29 }}>{value}</strong>
        <span style={{ display: "block", color: "#60758A", fontSize: 12, marginTop: 6 }}>{note}</span>
      </article>)}
    </section>

    <section style={{ maxWidth: 1180, margin: "28px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 18 }}>
      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 21, margin: "0 0 18px" }}>Subscription details</h2>
        {loading ? <p style={{ color: "#60758A" }}>Loading your subscription…</p> : currentSubscription ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><small style={{ color: "#60758A" }}>Plan</small><p style={{ fontWeight: 800, margin: "5px 0" }}>{label(currentSubscription.plan_code)}</p></div>
          <div><small style={{ color: "#60758A" }}>Status</small><p style={{ fontWeight: 800, margin: "5px 0" }}>{label(currentSubscription.status)}</p></div>
          <div><small style={{ color: "#60758A" }}>Billing</small><p style={{ fontWeight: 800, margin: "5px 0" }}>{label(currentSubscription.billing_mode ?? "manual")}</p></div>
          <div><small style={{ color: "#60758A" }}>Monthly amount</small><p style={{ fontWeight: 800, margin: "5px 0" }}>{currentSubscription.renewal_amount == null ? "—" : zar(Number(currentSubscription.renewal_amount))}</p></div>
          <div><small style={{ color: "#60758A" }}>Period starts</small><p style={{ fontWeight: 800, margin: "5px 0" }}>{date(currentSubscription.current_period_start)}</p></div>
          <div><small style={{ color: "#60758A" }}>Period ends</small><p style={{ fontWeight: 800, margin: "5px 0" }}>{date(currentSubscription.current_period_end)}</p></div>
        </div> : <p style={{ color: "#60758A", lineHeight: 1.7 }}>You are currently using free account access. Choose a plan below when paid subscriptions become available.</p>}
        <p style={{ color: "#60758A", fontSize: 12, lineHeight: 1.6, margin: "18px 0 0" }}>Paid plans are manually renewed. No automatic debit or recurring payment mandate is active.</p>
      </article>
      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 21, margin: "0 0 18px" }}>Search credit summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[["Allocated", creditTotals.allocated], ["Available", creditTotals.available], ["Consumed", creditTotals.consumed], ["Reserved", creditTotals.reserved]].map(([name, value]) => <div key={String(name)}><small style={{ color: "#60758A" }}>{name}</small><p style={{ fontFamily: "Manrope,sans-serif", fontSize: 25, fontWeight: 800, margin: "5px 0" }}>{Number(value).toLocaleString("en-ZA")}</p></div>)}
        </div>
        <p style={{ color: "#60758A", fontSize: 12, lineHeight: 1.6, margin: "18px 0 0" }}>Search-credit balances reflect credits recorded to your account. Your live allowance is controlled by the platform, not by this dashboard.</p>
      </article>
    </section>

    <section style={{ maxWidth: 1180, margin: "28px auto 0", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 21, margin: 0 }}>Choose a monthly plan</h2>
        <span style={{ color: "#60758A", fontSize: 12 }}>Prices in South African rand</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14, marginTop: 20 }}>
        {plans.map(plan => <article key={plan.code} style={{ border: selectedPlan === plan.code || (!selectedPlan && plan.featured) ? "2px solid #079BD3" : "1px solid #DCE8F1", borderRadius: 12, padding: 20, background: selectedPlan === plan.code ? "#F1FAFE" : "#fff" }}>
          {plan.featured && <small style={{ color: "#079BD3", fontWeight: 800, letterSpacing: 1 }}>POPULAR PLAN</small>}
          <h3 style={{ fontFamily: "Manrope,sans-serif", fontSize: 20, margin: "8px 0" }}>{plan.name}</h3>
          <p style={{ margin: "0 0 4px" }}><strong style={{ fontSize: 32 }}>{zar(plan.price)}</strong><span style={{ color: "#60758A", fontSize: 12 }}>/ month</span></p>
          <p style={{ color: "#079BD3", fontSize: 13, fontWeight: 800 }}>{plan.credits} searches per month</p>
          <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.65, minHeight: 62 }}>{plan.description}</p>
          <button type="button" onClick={() => setSelectedPlan(plan.code)} style={{ width: "100%", padding: "11px 14px", border: selectedPlan === plan.code ? "1px solid #079BD3" : "1px solid #DCE8F1", borderRadius: 8, background: selectedPlan === plan.code ? "#EAF7FC" : "#fff", color: "#075477", fontWeight: 800, cursor: "pointer" }}>{selectedPlan === plan.code ? "SELECTED" : "SELECT PLAN"}</button>
        </article>)}
      </div>
      <div style={{ marginTop: 18, padding: 18, borderRadius: 10, background: "#EAF7FC", border: "1px solid #B9E4F3" }}>
        <strong style={{ color: "#075477", display: "block", marginBottom: 5 }}>Online checkout is not available yet</strong>
        <p style={{ color: "#40566B", fontSize: 13, lineHeight: 1.65, margin: 0 }}>{selected ? `${selected.name} is selected at ${zar(selected.price)} per month for ${selected.credits} searches. ` : ""}Ekhaya Technologies is awaiting payment-provider approval. You can review plans here, but no payment will be initiated and no subscription will be changed.</p>
        <button type="button" disabled style={{ marginTop: 14, padding: "12px 18px", border: 0, borderRadius: 8, background: "#9FB5C5", color: "#fff", fontWeight: 800, cursor: "not-allowed" }}>PAYMENTS NOT YET ENABLED</button>
      </div>
    </section>

    <section style={{ maxWidth: 1180, margin: "28px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 18 }}>
      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 21, margin: "0 0 16px" }}>Payment history</h2>
        {loading ? <p style={{ color: "#60758A" }}>Loading payment history…</p> : payments.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}><thead><tr>{["Date","Amount","Provider","Status"].map(v => <th key={v} style={{ padding: "9px 7px", borderBottom: "1px solid #DCE8F1", color: "#60758A" }}>{v}</th>)}</tr></thead><tbody>{payments.map(payment => <tr key={payment.id}><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7" }}>{date(payment.paid_at ?? payment.created_at)}</td><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7", whiteSpace: "nowrap" }}>{zar(Number(payment.amount), payment.currency?.trim() || "ZAR")}</td><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7" }}>{label(payment.payment_provider)}</td><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7" }}>{label(payment.status)}</td></tr>)}</tbody></table></div> : <p style={{ color: "#60758A", lineHeight: 1.7 }}>No payments have been recorded on this account yet.</p>}
      </article>
      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 21, margin: "0 0 16px" }}>Recent search activity</h2>
        {loading ? <p style={{ color: "#60758A" }}>Loading usage…</p> : usage.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}><thead><tr>{["Date","Product searches","Live refreshes"].map(v => <th key={v} style={{ padding: "9px 7px", borderBottom: "1px solid #DCE8F1", color: "#60758A" }}>{v}</th>)}</tr></thead><tbody>{usage.slice(0,10).map(day => <tr key={day.usage_date}><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7" }}>{date(day.usage_date)}</td><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7" }}>{day.product_searches}</td><td style={{ padding: "11px 7px", borderBottom: "1px solid #EEF3F7" }}>{day.live_refreshes}</td></tr>)}</tbody></table></div> : <p style={{ color: "#60758A", lineHeight: 1.7 }}>Search activity will appear here as you use Price Checker.</p>}
      </article>
    </section>

    <footer style={{ maxWidth: 1180, margin: "32px auto 0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#71869A", fontSize: 12 }}>
      <span>© {new Date().getFullYear()} Ekhaya Technologies</span>
      <button type="button" onClick={() => void loadBilling()} disabled={loading} style={{ border: "1px solid #DCE8F1", background: "#fff", borderRadius: 8, padding: "9px 14px", color: "#075477", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Refreshing…" : "Refresh billing information"}</button>
    </footer>
  </main>;
}
