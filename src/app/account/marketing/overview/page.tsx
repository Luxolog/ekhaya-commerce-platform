"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Session = { access_token?: string; refresh_token?: string; expires_at?: number; [key: string]: unknown };
type Plan = { code: string; name: string; price_zar: number; billing_interval: string; monthly_ai_posts: number; monthly_campaign_ideas: number; monthly_research_queries: number; monthly_trend_reports: number };
type Subscription = { id: string; plan_code: string; status: string; billing_mode: string; current_period_start: string | null; current_period_end: string | null; created_at: string };
type Usage = { feature_code: string; quantity: number; created_at: string };
type Payment = { id: string; merchant_reference: string; amount: number; currency: string; status: string; payment_provider: string; paid_at: string | null; created_at: string };
type Campaign = { id: string; status: string; performance_notes: string | null; updated_at: string };
type CalendarPost = { id: string; status: string; scheduled_for: string };
type ResearchReport = { id: string; report_type: string; created_at: string };

const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
const fmtDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "—";
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const statusStyle = (status: string): React.CSSProperties => ({ display: "inline-block", borderRadius: 20, padding: "4px 9px", background: status === "active" || status === "complete" || status === "approved" ? "#E8F6EE" : status === "failed" || status === "past_due" ? "#FFF0ED" : "#F1F5F9", color: status === "active" || status === "complete" || status === "approved" ? "#147A46" : status === "failed" || status === "past_due" ? "#A43B2B" : "#52677B", fontSize: 11, fontWeight: 800 });

export default function MarketingOverviewPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = useCallback(async () => {
    if (!ANON_KEY) throw new Error("Seller account services are not configured.");
    let session: Session | null = null;
    try {
      const raw = localStorage.getItem("ekhaya_session");
      session = raw ? JSON.parse(raw) as Session : null;
    } catch { localStorage.removeItem("ekhaya_session"); }
    if (!session?.access_token || !session.refresh_token) throw new Error("Sign in to view your AI Marketing overview.");
    if (Number(session.expires_at) > Date.now() / 1000 + 60) return { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` };
    const response = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON_KEY }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
      localStorage.removeItem("ekhaya_session");
      throw new Error("Your seller session has expired. Please sign in again.");
    }
    localStorage.setItem("ekhaya_session", JSON.stringify({ ...session, ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600) }));
    return { apikey: ANON_KEY, Authorization: `Bearer ${data.access_token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const auth = await headers();
      const get = async <T,>(path: string): Promise<T[]> => {
        const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers: auth, cache: "no-store" });
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data.message ?? data.msg ?? "Unable to load Marketing records.");
        return data as T[];
      };
      const [subRows, planRows, paymentRows, campaignRows, postRows, reportRows] = await Promise.all([
        get<Subscription>("seller_marketing_subscriptions?select=id,plan_code,status,billing_mode,current_period_start,current_period_end,created_at&order=created_at.desc&limit=20"),
        get<Plan>("marketing_plans?select=code,name,price_zar,billing_interval,monthly_ai_posts,monthly_campaign_ideas,monthly_research_queries,monthly_trend_reports&is_active=eq.true"),
        get<Payment>("marketing_payment_transactions?select=id,merchant_reference,amount,currency,status,payment_provider,paid_at,created_at&order=created_at.desc&limit=20"),
        get<Campaign>("marketing_campaigns?select=id,status,performance_notes,updated_at&order=updated_at.desc&limit=100"),
        get<CalendarPost>("marketing_calendar_posts?select=id,status,scheduled_for&order=scheduled_for.desc&limit=200"),
        get<ResearchReport>("marketing_research_reports?select=id,report_type,created_at&order=created_at.desc&limit=100")
      ]);
      const active = subRows.find(s => s.status === "active");
      const periodStart = active?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const periodEnd = active?.current_period_end;
      const usageRows = await get<Usage>("marketing_usage_events?select=feature_code,quantity,created_at&created_at=gte." + encodeURIComponent(periodStart) + "&order=created_at.desc&limit=1000");
      setSubscriptions(subRows); setPlans(planRows); setPayments(paymentRows); setCampaigns(campaignRows); setPosts(postRows); setReports(reportRows);
      setUsage(usageRows.filter(item => !periodEnd || item.created_at < periodEnd));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load your Marketing overview."); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const active = subscriptions.find(s => s.status === "active") ?? null;
  const activePlan = plans.find(p => p.code === active?.plan_code) ?? null;
  const totals = useMemo(() => usage.reduce((acc, row) => { acc[row.feature_code] = (acc[row.feature_code] ?? 0) + Number(row.quantity || 0); return acc; }, {} as Record<string, number>), [usage]);
  const allowances = activePlan ? [
    { code: "ai_post", title: "AI content", limit: activePlan.monthly_ai_posts },
    { code: "campaign_idea", title: "Campaign ideas", limit: activePlan.monthly_campaign_ideas },
    { code: "research_query", title: "Research reports", limit: activePlan.monthly_research_queries },
    { code: "trend_report", title: "Trend planning", limit: activePlan.monthly_trend_reports }
  ] : [];
  const campaignNotes = campaigns.filter(c => c.performance_notes?.trim());
  const now = new Date();
  const monthPosts = posts.filter(p => { const d = new Date(p.scheduled_for); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
  const metrics = [
    ["Campaigns created", campaigns.length],
    ["Seller-approved campaigns", campaigns.filter(c => c.status === "approved").length],
    ["Calendar posts this month", monthPosts.length],
    ["Research reports saved", reports.length]
  ];

  return <main style={{ minHeight: "100vh", background: "#F5F8FB", color: "#102A43", padding: "26px 18px 50px" }}>
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div><Link href="/account/marketing/" style={{ color: "#0789BE", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>← AI Marketing workspace</Link><h1 style={{ fontSize: 28, margin: "12px 0 5px", fontFamily: "Manrope,sans-serif" }}>Marketing overview</h1><p style={{ margin: 0, color: "#60758A", fontSize: 13 }}>Subscription, usage, payments and marketing activity in one place.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ border: "1px solid #D5E1EA", borderRadius: 8, background: "#fff", padding: "10px 14px", color: "#075477", fontWeight: 800 }}>Refresh</button>
      </div>
      {error && <p role="alert" style={{ background: "#FFF0ED", color: "#A43B2B", padding: 12, borderRadius: 8 }}>{error}</p>}
      {loading ? <p style={{ padding: 24, color: "#60758A" }}>Loading your Marketing overview…</p> : <>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 22 }}>
          {metrics.map(([title, value]) => <article key={title} style={card}><p style={muted}>{title}</p><strong style={{ fontSize: 28 }}>{value}</strong></article>)}
        </section>
        <section style={{ ...card, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2 style={h2}>Subscription</h2><p style={muted}>AI Marketing is billed separately from your Price Checker subscription.</p></div><span style={statusStyle(active?.status ?? subscriptions[0]?.status ?? "not_subscribed")}>{label(active?.status ?? subscriptions[0]?.status ?? "not subscribed")}</span></div>
          {active && activePlan ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 14 }}>
            <div><p style={muted}>Current plan</p><strong>{activePlan.name}</strong></div><div><p style={muted}>Price</p><strong>{money(activePlan.price_zar)} / {activePlan.billing_interval}</strong></div><div><p style={muted}>Period starts</p><strong>{fmtDate(active.current_period_start)}</strong></div><div><p style={muted}>Period ends</p><strong>{fmtDate(active.current_period_end)}</strong></div><div><p style={muted}>Billing mode</p><strong>{label(active.billing_mode)}</strong></div>
          </div> : <p style={{ color: "#60758A", fontSize: 13, marginTop: 12 }}>No active Marketing subscription. Online checkout remains disabled pending merchant approval; no payment can be collected here.</p>}
          {subscriptions.length > 0 && <div style={{ overflowX: "auto", marginTop: 18 }}><h3 style={h3}>Subscription history</h3><table style={table}><thead><tr><th style={th}>Plan</th><th style={th}>Status</th><th style={th}>Billing</th><th style={th}>Started</th><th style={th}>Period ends</th></tr></thead><tbody>{subscriptions.map(s => <tr key={s.id}><td style={td}>{plans.find(p => p.code === s.plan_code)?.name ?? s.plan_code}</td><td style={td}><span style={statusStyle(s.status)}>{label(s.status)}</span></td><td style={td}>{label(s.billing_mode)}</td><td style={td}>{fmtDate(s.created_at)}</td><td style={td}>{fmtDate(s.current_period_end)}</td></tr>)}</tbody></table></div>}
        </section>
        <section style={{ ...card, marginTop: 14 }}><h2 style={h2}>Current-period usage</h2><p style={muted}>Usage is read from the server-side Marketing usage ledger, not calculated from browser activity.</p>
          {activePlan ? <div style={{ display: "grid", gap: 15, marginTop: 14 }}>{allowances.map(item => { const used = totals[item.code] ?? 0; const pct = item.limit ? Math.min(100, used / item.limit * 100) : 0; return <div key={item.code}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}><strong>{item.title}</strong><span>{used} / {item.limit} used · {Math.max(0, item.limit - used)} remaining</span></div><div style={{ height: 9, borderRadius: 20, background: "#E7EEF4", marginTop: 7, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: "#079BD3", borderRadius: 20 }} /></div></div> })}</div> : <p style={muted}>Usage allowances will appear when a Marketing subscription is active.</p>}
          <div style={{ overflowX: "auto", marginTop: 18 }}><h3 style={h3}>Recent usage events</h3><table style={table}><thead><tr><th style={th}>Feature</th><th style={th}>Quantity</th><th style={th}>Date</th></tr></thead><tbody>{usage.slice(0, 30).map((row, i) => <tr key={row.feature_code + row.created_at + i}><td style={td}>{label(row.feature_code)}</td><td style={td}>{row.quantity}</td><td style={td}>{fmtDate(row.created_at)}</td></tr>)}{usage.length === 0 && <tr><td style={td} colSpan={3}>No usage recorded for this billing period.</td></tr>}</tbody></table></div>
        </section>
        <section style={{ ...card, marginTop: 14 }}><h2 style={h2}>Marketing activity</h2><p style={muted}>These are counts of saved workspace records, not social-platform reach or sales results.</p><div style={{ overflowX: "auto", marginTop: 12 }}><table style={table}><thead><tr><th style={th}>Campaign</th><th style={th}>Seller notes</th><th style={th}>Last updated</th></tr></thead><tbody>{campaignNotes.slice(0, 15).map(c => <tr key={c.id}><td style={td}>{c.id.slice(0, 8)}</td><td style={td}>{c.performance_notes}</td><td style={td}>{fmtDate(c.updated_at)}</td></tr>)}{campaignNotes.length === 0 && <tr><td style={td} colSpan={3}>No seller-entered campaign performance notes yet.</td></tr>}</tbody></table></div><p style={{ marginTop: 12, color: "#71869A", fontSize: 12 }}>No platform analytics integration is connected. Impressions, clicks, reach, conversions and revenue are not inferred or fabricated.</p></section>
        <section style={{ ...card, marginTop: 14 }}><h2 style={h2}>Marketing payment history</h2><p style={muted}>Only transactions from the separate Marketing payment ledger appear here.</p><div style={{ overflowX: "auto", marginTop: 12 }}><table style={table}><thead><tr><th style={th}>Reference</th><th style={th}>Amount</th><th style={th}>Provider</th><th style={th}>Status</th><th style={th}>Date</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td style={td}>{p.merchant_reference}</td><td style={td}>{money(Number(p.amount))} {p.currency}</td><td style={td}>{label(p.payment_provider)}</td><td style={td}><span style={statusStyle(p.status)}>{label(p.status)}</span></td><td style={td}>{fmtDate(p.paid_at ?? p.created_at)}</td></tr>)}{payments.length === 0 && <tr><td style={td} colSpan={5}>No Marketing payments recorded yet.</td></tr>}</tbody></table></div></section>
        <section style={{ ...card, marginTop: 14 }}><h2 style={h2}>Research library</h2><p style={muted}>Saved reports created in Marketing Intelligence.</p><p style={{ fontSize: 26, fontWeight: 800, margin: "8px 0" }}>{reports.length} reports</p><Link href="/account/marketing/intelligence/" style={{ color: "#0789BE", fontWeight: 800, fontSize: 13 }}>Open Marketing Intelligence →</Link></section>
      </>}
      <footer style={{ marginTop: 24, color: "#71869A", fontSize: 12 }}>AI Marketing remains an optional add-on. Checkout and external social publishing are not enabled.</footer>
    </div>
  </main>;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #E1EAF1", borderRadius: 12, padding: 18, boxShadow: "0 4px 14px rgba(12,39,61,.04)" };
const muted: React.CSSProperties = { color: "#71869A", fontSize: 12, margin: "0 0 6px" };
const h2: React.CSSProperties = { fontSize: 18, margin: "0 0 5px", fontFamily: "Manrope,sans-serif" };
const h3: React.CSSProperties = { fontSize: 14, margin: "0 0 8px" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" };
const th: React.CSSProperties = { padding: "10px 8px", color: "#60758A", borderBottom: "1px solid #E1EAF1", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "10px 8px", borderBottom: "1px solid #EEF2F6", verticalAlign: "top" };
