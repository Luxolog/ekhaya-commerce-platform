"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
type Partner = { id: string; partner_name: string; partner_slug: string; referral_code: string; partner_user_id: string | null; status: string; program_live_at: string | null; created_at: string };
type Referral = { id: string; partner_id: string; partner_name: string; referred_user_id: string; referral_code: string; registered_at: string; first_paid_at: string | null; seller_display_name: string | null; seller_plan: string; seller_account_status: string };
type Commission = { id: string; partner_id: string; payment_month: string; plan_code: string; qualifying_amount: number; commission_rate: number; commission_amount: number; status: string; paid_at: string | null };
type Activity = { user_id: string; partner_id: string; partner_name: string; seller_display_name: string | null; seller_plan: string; marketplace: string; query: string; result_count: number; result_status: string; source: string; created_at: string };
type Data = { generated_at: string; totals: { partners: number; active_partners: number; registered_referred_sellers: number; paying_referred_sellers: number; total_commission_recorded: number; pending_commission: number; commission_paid: number; partner_searches: number; partner_search_failures: number }; partners: Partner[]; referrals: Referral[]; commissions: Commission[]; statements: Record<string, unknown>[]; activity: Activity[] };

const money = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n) || 0);
const when = (v?: string | null) => v ? new Date(v).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—";
const shell: React.CSSProperties = { minHeight: "100vh", background: "#F3F6FA", color: "#10243A", fontFamily: "Arial,sans-serif", padding: "26px clamp(16px,4vw,56px) 60px" };
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #DDE6EF", borderRadius: 14, padding: 20 };
const small: React.CSSProperties = { color: "#64778A", fontSize: 12 };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 10px", background: "#10243A", color: "#fff", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px 10px", borderBottom: "1px solid #EDF1F5", verticalAlign: "top" };

export default function EkhayaOwnerDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "partners" | "referrals" | "activity" | "commissions">("overview");

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
      if (!session?.access_token) throw new Error("Sign in with the Ekhaya owner account to access this dashboard.");
      const response = await fetch(API, {
        method: "POST",
        headers: { apikey: KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "owner_partner_analytics" }),
        cache: "no-store"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? (response.status === 403 ? "This account does not have Ekhaya owner permissions." : "Could not load owner dashboard."));
      setData(body as Data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the owner dashboard.");
      setData(null);
    } finally { setBusy(false); setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tabs = ["overview", "partners", "referrals", "activity", "commissions"] as const;

  // Keep dashboard sections in the URL so browser Back/Forward works.
  useEffect(() => {
    const syncTabFromUrl = () => {
      const requested = window.location.hash.replace(/^#/, "");
      if (tabs.includes(requested as typeof tabs[number])) {
        setTab(requested as typeof tabs[number]);
      } else {
        setTab("overview");
      }
    };
    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);
    window.addEventListener("hashchange", syncTabFromUrl);
    return () => {
      window.removeEventListener("popstate", syncTabFromUrl);
      window.removeEventListener("hashchange", syncTabFromUrl);
    };
  }, []);

  const navigateToTab = (next: typeof tabs[number]) => {
    setTab(next);
    const nextUrl = window.location.pathname + window.location.search + (next === "overview" ? "" : "#" + next);
    window.history.pushState({ ownerDashboardTab: next }, "", nextUrl);
  };
  const total = data?.totals;

  return <main style={shell}>
    <header style={{ maxWidth: 1440, margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #DDE6EF", paddingBottom: 18 }}>
      <div><div style={{ color: "#078FC4", fontWeight: 800, fontSize: 11, letterSpacing: 2 }}>EKHAYA TECHNOLOGIES</div><h1 style={{ fontSize: 30, margin: "7px 0 4px" }}>Owner Dashboard</h1><div style={small}>Central administration · Partners · Sellers · Activity · Commissions</div></div>
      <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        <Link href="/owner/users/" style={{ color: "#078FC4", fontWeight: 700 }}>Users</Link>
        <Link href="/owner/cache/" style={{ color: "#078FC4", fontWeight: 700 }}>Cache controls</Link>
        <Link href="/price-checker/" style={{ color: "#078FC4", fontWeight: 700 }}>Price Checker</Link>
        <button onClick={() => void load()} disabled={busy} style={{ border: 0, borderRadius: 8, background: "#10243A", color: "#fff", padding: "11px 15px", fontWeight: 700, cursor: "pointer" }}>{busy ? "Refreshing…" : "Refresh data"}</button>
      </nav>
    </header>

    <section style={{ maxWidth: 1440, margin: "0 auto" }}>
      {error && <div role="alert" style={{ ...panel, borderColor: "#E5B9B9", color: "#8A2E2E", marginBottom: 18 }}><b>Owner access / data error</b><p style={{ marginBottom: 0 }}>{error}</p>{error.toLowerCase().includes("sign in") && <Link href="/account/" style={{ display: "inline-block", marginTop: 12, color: "#078FC4", fontWeight: 700 }}>Go to sign in →</Link>}</div>}
      {loading && <div style={panel}>Loading owner dashboard…</div>}
      {data && total && <>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={small}>Live partner data · Last refreshed {when(data.generated_at)}</div>
          <div style={{ ...small, color: "#16835D", fontWeight: 700 }}>Owner-only data access</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 13, marginBottom: 20 }}>
          {[
            ["Total partners", String(total.partners)],
            ["Active partners", String(total.active_partners)],
            ["Referred sellers", String(total.registered_referred_sellers)],
            ["Paying referred sellers", String(total.paying_referred_sellers)],
            ["Partner searches", String(total.partner_searches)],
            ["Search failures", String(total.partner_search_failures)],
            ["Commission recorded", money(total.total_commission_recorded)],
            ["Pending / approved", money(total.pending_commission)],
            ["Commission paid", money(total.commission_paid)]
          ].map(([label,value]) => <article key={label} style={panel}><div style={small}>{label}</div><div style={{ fontSize: 25, fontWeight: 800, marginTop: 10 }}>{value}</div></article>)}
        </div>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {tabs.map(x => <button key={x} onClick={() => navigateToTab(x)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #DDE6EF", background: tab === x ? "#10243A" : "#fff", color: tab === x ? "#fff" : "#3C5368", textTransform: "capitalize", fontWeight: 700, cursor: "pointer" }}>{x}</button>)}
        </nav>

        {tab === "overview" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
          <section style={panel}><h2 style={{ fontSize: 18, marginTop: 0 }}>Partner accounts</h2>{data.partners.length ? data.partners.map(p => <div key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid #EDF1F5", display: "flex", justifyContent: "space-between", gap: 12 }}><div><b>{p.partner_name}</b><div style={small}>Referral code: {p.referral_code}</div></div><span style={{ fontSize: 12, fontWeight: 700, color: p.status === "active" ? "#16835D" : "#A66B1C" }}>{p.status}</span></div>) : <p style={small}>No partner records yet.</p>}</section>
          <section style={panel}><h2 style={{ fontSize: 18, marginTop: 0 }}>Recent partner activity</h2>{data.activity.slice(0,8).length ? data.activity.slice(0,8).map((a,i)=><div key={a.user_id+a.created_at+i} style={{ padding: "11px 0", borderBottom: "1px solid #EDF1F5" }}><b>{a.partner_name}</b><div style={small}>{a.seller_display_name || "Referred seller"} · {a.marketplace} · {a.result_status}</div><div style={{ fontSize: 12, marginTop: 4 }}>{a.query}</div><div style={{ ...small, marginTop: 4 }}>{when(a.created_at)}</div></div>) : <p style={small}>No search activity has been recorded for referred sellers yet.</p>}</section>
        </div>}

        {tab === "partners" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All partner accounts</h2><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Partner","Referral code","Status","Linked owner user","Go-live date","Created"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.partners.map(p=><tr key={p.id}><td style={td}><b>{p.partner_name}</b><div style={small}>{p.partner_slug}</div></td><td style={td}>{p.referral_code}</td><td style={td}>{p.status}</td><td style={td}>{p.partner_user_id ?? "Not linked"}</td><td style={td}>{when(p.program_live_at)}</td><td style={td}>{when(p.created_at)}</td></tr>)}</tbody></table></div>}

        {tab === "referrals" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All referred sellers</h2><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Partner","Seller","Plan","Account status","Registered","First payment"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.referrals.map(r=><tr key={r.id}><td style={td}>{r.partner_name}</td><td style={td}>{r.seller_display_name || r.referred_user_id}</td><td style={td}>{r.seller_plan}</td><td style={td}>{r.seller_account_status}</td><td style={td}>{when(r.registered_at)}</td><td style={td}>{when(r.first_paid_at)}</td></tr>)}</tbody></table>{!data.referrals.length && <p style={small}>No referred sellers recorded yet.</p>}</div>}

        {tab === "activity" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Partner-referred seller activity</h2><p style={small}>Marketplace searches made by sellers attributed to a partner. This view does not mix in unrelated seller activity.</p><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Date","Partner","Seller","Marketplace","Search query","Results","Status","Source"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.activity.map((a,i)=><tr key={a.user_id+a.created_at+i}><td style={td}>{when(a.created_at)}</td><td style={td}>{a.partner_name}</td><td style={td}>{a.seller_display_name || a.user_id}</td><td style={td}>{a.marketplace}</td><td style={td}>{a.query}</td><td style={td}>{a.result_count}</td><td style={td}>{a.result_status}</td><td style={td}>{a.source}</td></tr>)}</tbody></table>{!data.activity.length && <p style={small}>No partner-referred seller activity recorded yet.</p>}</div>}

        {tab === "commissions" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All partner commissions</h2><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Payment month","Partner","Plan","Qualifying amount","Rate","Commission","Status","Paid on"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.commissions.map(c=><tr key={c.id}><td style={td}>{when(c.payment_month)}</td><td style={td}>{data.partners.find(p=>p.id===c.partner_id)?.partner_name ?? c.partner_id}</td><td style={td}>{c.plan_code}</td><td style={td}>{money(c.qualifying_amount)}</td><td style={td}>{(Number(c.commission_rate)*100).toFixed(2)}%</td><td style={td}>{money(c.commission_amount)}</td><td style={td}>{c.status}</td><td style={td}>{when(c.paid_at)}</td></tr>)}</tbody></table>{!data.commissions.length && <p style={small}>No commission entries recorded yet.</p>}</div>}
      </>}
      <footer style={{ ...small, marginTop: 24, textAlign: "center" }}>Ekhaya Owner Dashboard · Permanent administration portal · Data is restricted to authorised owner accounts</footer>
    </section>
  </main>;
}
