"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Session = { access_token?: string; refresh_token?: string; expires_at?: number; [key: string]: unknown };
type MarketingPlan = {
  code: string; name: string; price_zar: number; billing_interval: string;
  monthly_ai_posts: number; monthly_campaign_ideas: number;
  monthly_research_queries: number; monthly_trend_reports: number;
};
type MarketingSubscription = {
  id: string; plan_code: string; status: string; billing_mode: string;
  current_period_start?: string | null; current_period_end?: string | null; created_at: string;
};
type UsageEvent = { feature_code: string; quantity: number; created_at: string };
type Campaign = { id: string; title: string; objective?: string | null; platform?: string | null; status: string; updated_at: string };

const money = (amount: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(amount);
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "Not started";

export default function MarketingDashboardPage() {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [subscriptions, setSubscriptions] = useState<MarketingSubscription[]>([]);
  const [usage, setUsage] = useState<UsageEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [platform, setPlatform] = useState("instagram");

  const getHeaders = useCallback(async () => {
    if (!ANON_KEY) throw new Error("Seller account services are not configured. Please contact Ekhaya support.");
    let session: Session | null = null;
    try {
      const raw = localStorage.getItem("ekhaya_session");
      session = raw ? JSON.parse(raw) as Session : null;
    } catch {
      localStorage.removeItem("ekhaya_session");
    }
    if (!session?.access_token || !session.refresh_token) throw new Error("Sign in to access AI Marketing.");
    if (Number(session.expires_at) > Date.now() / 1000 + 60) {
      return { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` };
    }
    const refreshed = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const payload = await refreshed.json().catch(() => ({}));
    if (!refreshed.ok || typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
      localStorage.removeItem("ekhaya_session");
      throw new Error("Your seller sign-in has expired. Please sign in again.");
    }
    const next = { ...session, ...payload, expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in ?? 3600) };
    localStorage.setItem("ekhaya_session", JSON.stringify(next));
    return { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${payload.access_token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await getHeaders();
      const get = async <T,>(path: string): Promise<T[]> => {
        const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers, cache: "no-store" });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error(body.message ?? body.msg ?? "Unable to load AI Marketing information.");
        return body as T[];
      };
      const monthStart = new Date();
      monthStart.setDate(1);
      const from = monthStart.toISOString();
      const [plans, subs, events, drafts] = await Promise.all([
        get<MarketingPlan>("marketing_plans?select=code,name,price_zar,billing_interval,monthly_ai_posts,monthly_campaign_ideas,monthly_research_queries,monthly_trend_reports&is_active=eq.true&order=price_zar.asc"),
        get<MarketingSubscription>("seller_marketing_subscriptions?select=id,plan_code,status,billing_mode,current_period_start,current_period_end,created_at&order=created_at.desc&limit=10"),
        get<UsageEvent>("marketing_usage_events?select=feature_code,quantity,created_at&created_at=gte." + encodeURIComponent(from) + "&order=created_at.desc&limit=500"),
        get<Campaign>("marketing_campaigns?select=id,title,objective,platform,status,updated_at&order=updated_at.desc&limit=10"),
      ]);
      setPlan(plans.find(item => item.code === "marketing_mini") ?? plans[0] ?? null);
      setSubscriptions(subs);
      setUsage(events);
      setCampaigns(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load AI Marketing.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => { void load(); }, [load]);

  const activeSubscription = subscriptions.find(item => item.status === "active") ?? null;
  const usageTotals = useMemo(() => usage.reduce((totals, event) => {
    totals[event.feature_code] = (totals[event.feature_code] ?? 0) + Number(event.quantity || 0);
    return totals;
  }, {} as Record<string, number>), [usage]);

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSubscription) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_campaigns", {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ title: title.trim(), objective: objective.trim() || null, platform, status: "draft" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? payload.msg ?? "Unable to save campaign draft.");
      setTitle(""); setObjective("");
      setNotice("Campaign draft saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save campaign draft.");
    } finally {
      setBusy(false);
    }
  }

  const quotaRows = plan ? [
    ["AI social posts", "ai_post", plan.monthly_ai_posts],
    ["Campaign ideas", "campaign_idea", plan.monthly_campaign_ideas],
    ["Research queries", "research_query", plan.monthly_research_queries],
    ["Trend reports", "trend_report", plan.monthly_trend_reports],
  ] as const : [];

  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "24px clamp(18px,5vw,72px) 64px", fontFamily: "Arial,sans-serif" }}>
    <header style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={150} style={{ width: 150, height: "auto" }} priority /></Link>
      <nav style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
        <Link href="/price-checker/" style={{ color: "#60758A" }}>Price Checker</Link>
        <Link href="/account/billing/" style={{ color: "#60758A" }}>Billing</Link>
        <Link href="/account/" style={{ color: "#079BD3" }}>My account</Link>
      </nav>
    </header>

    <section style={{ maxWidth: 1180, margin: "46px auto 26px" }}>
      <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>EKHAYA MARKETPLACE · SELLER GROWTH</p>
      <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(34px,5vw,52px)", letterSpacing: "-.045em", margin: "8px 0" }}>AI Marketing</h1>
      <p style={{ color: "#60758A", lineHeight: 1.7, maxWidth: 720, margin: 0 }}>Research your market, plan campaigns and create consistent content without leaving your Ekhaya seller account.</p>
    </section>

    {error && <div role="alert" style={{ maxWidth: 1180, margin: "0 auto 18px", padding: 14, borderRadius: 10, background: "#FFF4E8", color: "#79410B", border: "1px solid #F2D4B5" }}>{error} {error.includes("Sign in") || error.includes("expired") ? <Link href="/account/" style={{ fontWeight: 800, textDecoration: "underline" }}>Sign in</Link> : null}</div>}
    {notice && <div role="status" style={{ maxWidth: 1180, margin: "0 auto 18px", padding: 14, borderRadius: 10, background: "#EAF7FC", color: "#075477" }}>{notice}</div>}

    <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 18 }}>
      <article style={{ background: "#071B31", color: "#fff", borderRadius: 16, padding: 26 }}>
        <p style={{ color: "#8EDCF7", fontSize: 10, fontWeight: 800, letterSpacing: 1.8 }}>OPTIONAL SELLER ADD-ON</p>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 27, margin: "8px 0" }}>Marketing Mini</h2>
        <p style={{ color: "#C5D7E5", fontSize: 14, lineHeight: 1.7, margin: "0 0 18px" }}>A practical marketing toolkit for marketplace sellers who want to grow their brand and reach more customers.</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}><strong style={{ fontSize: 42 }}>{plan ? money(Number(plan.price_zar)) : "R29"}</strong><span style={{ color: "#C5D7E5", fontSize: 13 }}>/ month</span></div>
        <p style={{ color: "#C5D7E5", fontSize: 12, marginTop: 8 }}>{activeSubscription ? "Your marketing add-on is active." : "Separate from your Price Checker subscription."}</p>
        <div style={{ marginTop: 18, padding: 13, borderRadius: 9, background: "#18334B", fontSize: 12, lineHeight: 1.6 }}>
          {activeSubscription ? "Marketing access is enabled for your account." : "Online payment activation is pending merchant approval. No payment will be collected from this page yet."}
        </div>
        <button type="button" disabled style={{ width: "100%", padding: 13, marginTop: 16, border: 0, borderRadius: 8, background: "#7890A3", color: "#fff", fontWeight: 800, cursor: "not-allowed" }}>{activeSubscription ? "SUBSCRIPTION ACTIVE" : "SUBSCRIPTIONS NOT YET ENABLED"}</button>
      </article>

      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 16, padding: 26 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 21, margin: "0 0 16px" }}>Included each month</h2>
        {quotaRows.map(([name, code, quota]) => <div key={code} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid #EEF3F7" }}><span style={{ color: "#40566B", fontSize: 13 }}>{name}</span><strong>{quota}</strong></div>)}
        {!plan && !loading && <p style={{ color: "#60758A", fontSize: 13 }}>Package details are temporarily unavailable. Please refresh or contact support.</p>}
        <p style={{ color: "#71869A", fontSize: 11, lineHeight: 1.6, marginTop: 16 }}>Monthly allowances are tracked separately from marketplace search credits. Unused allowances do not convert into Price Checker searches.</p>
      </article>
    </section>

    <section style={{ maxWidth: 1180, margin: "22px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 18 }}>
      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 20, margin: "0 0 14px" }}>Your monthly usage</h2>
        {quotaRows.map(([name, code, quota]) => <div key={code} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 6 }}><span>{name}</span><strong>{usageTotals[code] ?? 0} / {quota}</strong></div>
          <div style={{ height: 7, borderRadius: 99, background: "#E8F0F5", overflow: "hidden" }}><div style={{ width: quota ? Math.min(100, ((usageTotals[code] ?? 0) / quota) * 100) + "%" : "0%", height: "100%", background: "#079BD3", borderRadius: 99 }} /></div>
        </div>)}
        {!activeSubscription && <p style={{ color: "#71869A", fontSize: 12, lineHeight: 1.6 }}>Usage starts when your marketing subscription is activated after confirmed payment.</p>}
      </article>

      <article style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 20, margin: "0 0 8px" }}>Campaign workspace</h2>
        <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>Save campaign briefs and keep drafts together. Publishing is not connected; content must be reviewed and approved before any future scheduling integration.</p>
        {activeSubscription ? <form onSubmit={saveDraft} style={{ display: "grid", gap: 10 }}>
          <input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Campaign title" style={field}/>
          <textarea value={objective} onChange={event => setObjective(event.target.value)} maxLength={1000} rows={3} placeholder="What do you want this campaign to achieve?" style={{ ...field, height: "auto", padding: 12, resize: "vertical" }}/>
          <select value={platform} onChange={event => setPlatform(event.target.value)} style={field}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="other">Other</option></select>
          <button type="submit" disabled={busy || !title.trim()} style={{ padding: 12, border: 0, borderRadius: 8, background: "#079BD3", color: "#fff", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}>{busy ? "Saving…" : "SAVE CAMPAIGN DRAFT"}</button>
        </form> : <div style={{ padding: 14, background: "#F4F8FC", borderRadius: 9, color: "#60758A", fontSize: 12, lineHeight: 1.6 }}>Campaign drafting will unlock with an active Marketing Mini subscription. Payment activation is currently disabled.</div>}
      </article>
    </section>

    <section style={{ maxWidth: 1180, margin: "22px auto 0", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 20, margin: 0 }}>Recent campaign drafts</h2>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ border: "1px solid #DCE8F1", background: "#fff", borderRadius: 8, padding: "9px 13px", color: "#075477", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      {loading ? <p style={{ color: "#60758A", fontSize: 13 }}>Loading marketing workspace…</p> : campaigns.length ? <div style={{ overflowX: "auto", marginTop: 12 }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}><thead><tr>{["Campaign","Platform","Status","Last updated"].map(label => <th key={label} style={{ padding: 10, color: "#60758A", borderBottom: "1px solid #DCE8F1" }}>{label}</th>)}</tr></thead><tbody>{campaigns.map(campaign => <tr key={campaign.id}><td style={{ padding: 10, borderBottom: "1px solid #EEF3F7", fontWeight: 700 }}>{campaign.title}</td><td style={{ padding: 10, borderBottom: "1px solid #EEF3F7" }}>{campaign.platform ? pretty(campaign.platform) : "—"}</td><td style={{ padding: 10, borderBottom: "1px solid #EEF3F7" }}>{pretty(campaign.status)}</td><td style={{ padding: 10, borderBottom: "1px solid #EEF3F7" }}>{date(campaign.updated_at)}</td></tr>)}</tbody></table></div> : <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 14 }}>No campaign drafts yet.</p>}
    </section>

    <footer style={{ maxWidth: 1180, margin: "30px auto 0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#71869A", fontSize: 12 }}>
      <span>© {new Date().getFullYear()} Ekhaya Technologies</span>
      <span>AI Marketing is an optional add-on and does not change your Price Checker plan.</span>
    </footer>
  </main>;
}

const field: React.CSSProperties = { boxSizing: "border-box", width: "100%", minHeight: 44, padding: "0 12px", border: "1px solid #DCE8F1", borderRadius: 7, fontSize: 13, background: "#fff", color: "#071B31" };
