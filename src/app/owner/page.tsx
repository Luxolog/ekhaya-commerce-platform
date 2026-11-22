"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
type Partner = { id: string; partner_name: string; partner_slug: string; referral_code: string; partner_user_id: string | null; account_id?: string | null; status: string; program_live_at: string | null; created_at: string };
type Referral = { id: string; partner_id: string; partner_name: string; referred_user_id: string; referral_code: string; registered_at: string; first_paid_at: string | null; seller_display_name: string | null; seller_plan: string; seller_account_status: string };
type Commission = { id: string; partner_id: string; payment_month: string; plan_code: string; qualifying_amount: number; commission_rate: number; commission_amount: number; status: string; paid_at: string | null };
type Activity = { user_id: string; partner_id: string; partner_name: string; seller_display_name: string | null; seller_plan: string; marketplace: string; query: string; result_count: number; result_status: string; source: string; created_at: string };
type Seller = { id: string; account_id: string | null; email: string | null; display_name: string | null; created_at: string | null; last_sign_in_at: string | null; email_confirmed_at: string | null; role: string; account_status: string; plan_code: string; subscription_status: string; subscription_period_end: string | null; partner_name: string | null; referral_code: string | null; searches: number; search_failures: number; last_search: string | null; payments_count: number; payments_total: number; monthly_search_allowance: number; monthly_searches_used: number; monthly_searches_remaining: number; provider_api_calls: number };
type PlatformActivity = { user_id: string | null; seller_email: string | null; seller_display_name: string | null; seller_plan: string; marketplace?: string; query: string; result_count: number; result_status: string; source?: string; provider?: string; action?: string; credits_charged?: number; event_type: string; partner_name?: string | null; created_at: string };
type Data = { generated_at: string; totals: { users: number; sellers: number; active_sellers: number; paying_sellers: number; total_searches: number; total_search_failures: number; provider_api_events: number; total_payments: number; partners: number; active_partners: number; registered_referred_sellers: number; paying_referred_sellers: number; total_commission_recorded: number; pending_commission: number; commission_paid: number; partner_searches: number; partner_search_failures: number; monthly_search_allowance: number; monthly_searches_used: number; monthly_searches_remaining: number }; sellers: Seller[]; all_activity: PlatformActivity[]; api_usage: Record<string, unknown>[]; partners: Partner[]; referrals: Referral[]; commissions: Commission[]; statements: Record<string, unknown>[]; activity: Activity[] };

const money = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n) || 0);
const when = (v?: string | null) => v ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(v)) + " SAST" : "—";
const shell: React.CSSProperties = { minHeight: "100vh", background: "#F3F6FA", color: "#10243A", fontFamily: "Arial,sans-serif", padding: "26px clamp(16px,4vw,56px) 60px" };
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #DDE6EF", borderRadius: 14, padding: 20 };
const small: React.CSSProperties = { color: "#64778A", fontSize: 12 };
const OWNER_TABS = ["overview", "sellers", "searches", "platform activity", "partners", "referrals", "activity", "commissions", "api usage"] as const;
const th: React.CSSProperties = { textAlign: "left", padding: "12px 10px", background: "#10243A", color: "#fff", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px 10px", borderBottom: "1px solid #EDF1F5", verticalAlign: "top" };

export default function EkhayaOwnerDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof OWNER_TABS)[number]>("overview");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerSlug, setNewPartnerSlug] = useState("");
  const [newPartnerReferralCode, setNewPartnerReferralCode] = useState("");
  const [newPartnerFeedback, setNewPartnerFeedback] = useState("");
  const [newPartnerBusy, setNewPartnerBusy] = useState(false);
  const [activationBusyId, setActivationBusyId] = useState("");
  const [activationFeedback, setActivationFeedback] = useState("");
  const [invitePartnerId, setInvitePartnerId] = useState("");
  const [inviteContactName, setInviteContactName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [partnerInvitations, setPartnerInvitations] = useState<Array<{id:string;partner_id:string;invited_email:string;contact_name:string|null;status:string;invited_at:string;expires_at:string;accepted_at:string|null}>>([]);
  const manageInvitations = async (payload: Record<string,string>) => {
    const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
    if (!session?.access_token) throw new Error("Sign in with the Ekhaya owner account first.");
    const response = await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/invite-saechamber-partner", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Partner invitation request failed.");
    return body;
  };
  const loadPartnerInvitations = async () => {
    try { const result = await manageInvitations({ action: "list" }); setPartnerInvitations(result.invitations || []); }
    catch (e) { setInviteFeedback(e instanceof Error ? e.message : "Could not load invitations."); }
  };
  const sendPartnerInvitation = async () => {
    if (!invitePartnerId || !inviteContactName.trim() || !inviteEmail.trim()) return;
    setInviteBusy(true); setInviteFeedback("");
    try { const result = await manageInvitations({ partner_id: invitePartnerId, contact_name: inviteContactName.trim(), email: inviteEmail.trim() }); setInviteFeedback("Invitation sent to " + result.invited_email + " for " + result.partner_name + ". It expires in 14 days."); setInviteContactName(""); setInviteEmail(""); await loadPartnerInvitations(); }
    catch (e) { setInviteFeedback(e instanceof Error ? e.message : "Invitation could not be sent."); }
    finally { setInviteBusy(false); }
  };

  const registerPartner = async () => {
    if (!newPartnerName.trim()) return;
    setNewPartnerBusy(true); setNewPartnerFeedback("");
    try {
      const body = await manageInvitations({ action: "create_partner", partner_name: newPartnerName.trim(), partner_slug: newPartnerSlug.trim(), referral_code: newPartnerReferralCode.trim() });
      setNewPartnerFeedback("Partner programme registered: " + body.partner.partner_name + " · " + body.partner.referral_code + ". Status: pending. You can now invite its owner.");
      setNewPartnerName(""); setNewPartnerSlug(""); setNewPartnerReferralCode("");
      await load();
      setInvitePartnerId(body.partner.id);
    } catch (e) {
      setNewPartnerFeedback(e instanceof Error ? e.message : "Partner registration failed.");
    } finally { setNewPartnerBusy(false); }
  };

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

  useEffect(() => {
    if (tab === "partners" && data) void loadPartnerInvitations();
  }, [tab, data]);

  const [sellerReviewBusyId, setSellerReviewBusyId] = useState("");
  const [sellerReviewFeedback, setSellerReviewFeedback] = useState("");

  const reviewSeller = async (seller: Seller, status: "active" | "inactive") => {
    setSellerReviewBusyId(seller.id); setSellerReviewFeedback("");
    try {
      const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
      if (!session?.access_token) throw new Error("Sign in with the Ekhaya owner account first.");
      const response = await fetch(API, {
        method: "POST",
        headers: { apikey: KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_user_status", user_id: seller.id, status, reason: status === "active" ? "Approved by Ekhaya owner" : "Seller application declined by Ekhaya owner" }),
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Seller review could not be saved.");
      setSellerReviewFeedback(status === "active" ? (seller.email || "Seller") + " approved." : (seller.email || "Seller") + " declined.");
      await load();
    } catch (e) {
      setSellerReviewFeedback(e instanceof Error ? e.message : "Seller review failed.");
    } finally { setSellerReviewBusyId(""); }
  };

  const activatePartner = async (partnerId: string) => {
    setActivationBusyId(partnerId); setActivationFeedback("");
    try {
      const result = await manageInvitations({ action: "activate_partner", partner_id: partnerId });
      setActivationFeedback(result.message || "Partner programme activated.");
      await load();
    } catch (e) {
      setActivationFeedback(e instanceof Error ? e.message : "Partner activation failed.");
    } finally { setActivationBusyId(""); }
  };

  // Keep dashboard sections in the URL so browser Back/Forward works.
  useEffect(() => {
    const syncTabFromUrl = () => {
      const requested = window.location.hash.replace(/^#/, "").replace(/-/g, " ");
      if (OWNER_TABS.includes(requested as typeof OWNER_TABS[number])) {
        setTab(requested as typeof OWNER_TABS[number]);
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

  const navigateToTab = (next: typeof OWNER_TABS[number]) => {
    setTab(next);
    const nextUrl = window.location.pathname + window.location.search + (next === "overview" ? "" : "#" + next.replace(/\s+/g, "-"));
    window.history.pushState({ ownerDashboardTab: next }, "", nextUrl);
  };
  const total = data?.totals;

  return <main style={shell}>
    <header style={{ maxWidth: 1440, margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #DDE6EF", paddingBottom: 18 }}>
      <div><Link href="/" aria-label="Go to Ekhaya Technologies home" style={{ color: "#078FC4", fontWeight: 800, fontSize: 11, letterSpacing: 2, textDecoration: "none" }}>EKHAYA TECHNOLOGIES ↗</Link><h1 style={{ fontSize: 30, margin: "7px 0 4px" }}>Owner Dashboard</h1><div style={small}>Central administration · Partners · Sellers · Activity · Commissions</div></div>
      <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        <Link href="/account/security/" style={{ color: "#078FC4", fontWeight: 700 }}>Security settings</Link>
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
        <nav aria-label="Owner dashboard sections" style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 18px", padding: "12px 0", background: "#F3F6FA", borderBottom: "1px solid #DDE6EF" }}>
          {OWNER_TABS.map(x => <button key={x} aria-current={tab === x ? "page" : undefined} onClick={() => navigateToTab(x)} style={{ padding: "10px 15px", borderRadius: 8, border: tab === x ? "1px solid #10243A" : "1px solid #DDE6EF", background: tab === x ? "#10243A" : "#fff", color: tab === x ? "#fff" : "#3C5368", textTransform: "capitalize", fontWeight: 700, cursor: "pointer" }}>{x}</button>)}
        </nav>
        {tab === "overview" && <div style={{ display: "grid", gap: 18 }}>
          <section style={{ ...panel, background: "linear-gradient(120deg,#10243A 0%,#173D5A 100%)", color: "#fff", border: 0, padding: 24 }}>
            <div style={{ color: "#7DD3FC", fontSize: 11, fontWeight: 800, letterSpacing: 1.8 }}>PLATFORM COMMAND CENTRE</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
              <div><h2 style={{ fontSize: 25, margin: "0 0 7px" }}>Platform overview</h2><p style={{ margin: 0, color: "#D5E2ED", fontSize: 13 }}>A live summary of sellers, marketplace activity, usage, partners and revenue administration.</p></div>
              <div style={{ color: "#D5E2ED", fontSize: 12 }}>Data refreshed {when(data.generated_at)}</div>
            </div>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(205px,1fr))", gap: 13 }}>
            {[
              { label: "Registered sellers", value: String(total.sellers), detail: total.active_sellers + " active accounts", color: "#078FC4" },
              { label: "Marketplace searches", value: String(total.total_searches), detail: total.total_search_failures + " unsuccessful searches", color: "#16835D" },
              { label: "Provider API calls", value: String(total.provider_api_events), detail: "Logged across connected providers", color: "#7657C8" },
              { label: "Search credits remaining", value: String(total.monthly_searches_remaining), detail: total.monthly_searches_used + " used of " + total.monthly_search_allowance + " allocated", color: "#C17A24" }
            ].map(item => <article key={item.label} style={{ ...panel, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={small}>{item.label}</span><span style={{ width: 9, height: 9, borderRadius: 20, background: item.color, display: "inline-block" }} /></div>
              <div style={{ fontSize: 30, lineHeight: 1.2, fontWeight: 800, margin: "10px 0 5px" }}>{item.value}</div><div style={small}>{item.detail}</div>
            </article>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, alignItems: "start" }}>
            <section style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}><div><h3 style={{ margin: 0, fontSize: 17 }}>Recent platform activity</h3><p style={{ ...small, margin: "5px 0 0" }}>Latest seller searches and provider API events</p></div><button onClick={() => navigateToTab("platform activity")} style={{ border: 0, background: "#EAF5FA", color: "#087EAC", borderRadius: 8, padding: "8px 11px", fontWeight: 700, cursor: "pointer" }}>View all</button></div>
              {data.all_activity.slice(0,7).length ? data.all_activity.slice(0,7).map((a,i)=><div key={String(a.user_id)+a.created_at+i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderTop: "1px solid #EDF1F5" }}>
                <div style={{ minWidth: 0 }}><b style={{ fontSize: 13 }}>{a.seller_display_name || a.seller_email || "Platform event"}</b><div style={{ ...small, marginTop: 3 }}>{a.event_type === "provider_usage" ? (a.provider || "Provider") + " API · " + (a.marketplace || "Marketplace") : "Seller search · " + (a.marketplace || "Marketplace")}</div><div style={{ fontSize: 12, marginTop: 4, overflowWrap: "anywhere" }}>{a.query || a.action || "Usage event"}</div></div>
                <div style={{ textAlign: "right", flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 700, color: a.result_status === "success" ? "#16835D" : "#A66B1C" }}>{a.result_status || "logged"}</span><div style={{ ...small, marginTop: 5 }}>{when(a.created_at)}</div></div>
              </div>) : <p style={small}>No platform activity has been recorded yet.</p>}
            </section>

            <section style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}><div><h3 style={{ margin: 0, fontSize: 17 }}>Seller performance</h3><p style={{ ...small, margin: "5px 0 0" }}>Highest recorded search activity by seller</p></div><button onClick={() => navigateToTab("sellers")} style={{ border: 0, background: "#EAF5FA", color: "#087EAC", borderRadius: 8, padding: "8px 11px", fontWeight: 700, cursor: "pointer" }}>View sellers</button></div>
              {data.sellers.filter(s=>s.role!=="owner").sort((a,b)=>b.searches-a.searches).slice(0,6).map(s=><div key={s.id} style={{ padding: "12px 0", borderTop: "1px solid #EDF1F5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><b style={{ fontSize: 13 }}>{s.display_name || s.email || "Seller"}</b><div style={small}>{s.plan_code} plan · {s.subscription_status}</div></div><b style={{ fontSize: 14 }}>{s.searches} searches</b></div>
                <div style={{ height: 6, background: "#EDF2F7", borderRadius: 10, marginTop: 9, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min(100, (s.searches / Math.max(1, ...data.sellers.map(x=>x.searches))) * 100) + "%", background: "#078FC4", borderRadius: 10 }} /></div>
              </div>)}
              {!data.sellers.some(s=>s.role!=="owner") && <p style={small}>No seller accounts are available.</p>}
            </section>

            <section style={panel}>
              <h3 style={{ margin: "0 0 5px", fontSize: 17 }}>Partner programme</h3><p style={{ ...small, margin: "0 0 14px" }}>Referral network and partner performance</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                {[["Partners",total.partners],["Active partners",total.active_partners],["Referred sellers",total.registered_referred_sellers],["Partner searches",total.partner_searches]].map(([label,value])=><div key={String(label)} style={{ background: "#F5F8FB", borderRadius: 10, padding: 13 }}><div style={small}>{label}</div><div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>{value}</div></div>)}
              </div>
              <button onClick={() => navigateToTab("partners")} style={{ marginTop: 13, border: 0, background: "#EAF5FA", color: "#087EAC", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>Manage partners</button>
            </section>

            <section style={panel}>
              <h3 style={{ margin: "0 0 5px", fontSize: 17 }}>Payments and commissions</h3><p style={{ ...small, margin: "0 0 14px" }}>Recorded payment and partner commission position</p>
              <div style={{ display: "grid", gap: 11 }}>
                {[["Successful payments",String(total.total_payments)],["Commission recorded",money(total.total_commission_recorded)],["Pending / approved",money(total.pending_commission)],["Commission paid",money(total.commission_paid)]].map(([label,value])=><div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #EDF1F5", paddingBottom: 9 }}><span style={small}>{label}</span><b style={{ fontSize: 14 }}>{value}</b></div>)}
              </div>
              <button onClick={() => navigateToTab("commissions")} style={{ marginTop: 13, border: 0, background: "#EAF5FA", color: "#087EAC", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>View commissions</button>
            </section>
          </div>
        </div>}

        {tab === "sellers" && <div style={{ display: "grid", gap: 16 }}>
          <section style={{ ...panel, overflowX: "auto" }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Pending seller applications</h2>
            <p style={small}>Review new seller accounts here. Approval requires a verified email and an available pilot seat. Declining marks the account inactive; it does not delete the account.</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Seller","Email","Email verification","Joined","Review"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.sellers.filter(s=>s.role!=="owner" && s.account_status==="pending").map(s=><tr key={s.id}><td style={td}><b>{s.display_name || "Seller"}</b><div style={small}>{s.id}</div></td><td style={td}>{s.email || "—"}</td><td style={td}>{s.email_confirmed_at ? "Verified" : "Not verified"}</td><td style={td}>{when(s.created_at)}</td><td style={td}><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" aria-label={"Approve "+(s.email||"seller")} title="Approve seller" disabled={sellerReviewBusyId===s.id || !s.email_confirmed_at} onClick={()=>void reviewSeller(s,"active")} style={{border:0,borderRadius:7,padding:"8px 12px",background:s.email_confirmed_at?"#16835D":"#E8EDF2",color:s.email_confirmed_at?"#fff":"#65788A",fontWeight:800,cursor:s.email_confirmed_at?"pointer":"not-allowed"}}>✓ Approve</button><button type="button" aria-label={"Decline "+(s.email||"seller")} title="Decline seller application" disabled={sellerReviewBusyId===s.id} onClick={()=>void reviewSeller(s,"inactive")} style={{border:0,borderRadius:7,padding:"8px 12px",background:"#9B3D3D",color:"#fff",fontWeight:800,cursor:"pointer"}}>✕ Decline</button></div></td></tr>)}</tbody></table>
            {!data.sellers.some(s=>s.role!=="owner" && s.account_status==="pending") && <p style={small}>There are no pending seller applications.</p>}
            {sellerReviewFeedback && <p role="status" style={{...small,marginTop:10}}>{sellerReviewFeedback}</p>}
          </section>
          <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All registered sellers and accounts</h2><p style={small}>Private owner view of every registered account, subscription, referral attribution and seller usage.</p><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Seller","Email","Plan","Subscription","Account","Partner","Searches","Failures","Last search","Payments","Joined","Last sign-in"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.sellers.filter(s=>s.role!=="owner").map(s=><tr key={s.id}><td style={td}><b>{s.display_name || "Seller"}</b><div style={small}>{s.id}</div></td><td style={td}>{s.email || "—"}</td><td style={td}>{s.plan_code}</td><td style={td}>{s.subscription_status}</td><td style={td}>{s.account_status}</td><td style={td}>{s.partner_name || "Direct"}</td><td style={td}>{s.searches}</td><td style={td}>{s.search_failures}</td><td style={td}>{when(s.last_search)}</td><td style={td}>{s.payments_count} · {money(s.payments_total)}</td><td style={td}>{when(s.created_at)}</td><td style={td}>{when(s.last_sign_in_at)}</td></tr>)}</tbody></table>{!data.sellers.some(s=>s.role!=="owner") && <p style={small}>No seller accounts found.</p>}</div></div>}

        {tab === "searches" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All seller marketplace searches</h2><p style={small}>Search history across all sellers, including marketplace, search term, result count, status and timestamp.</p><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Date","Seller","Email","Plan","Marketplace","Search query","Results","Status","Source","Partner"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.all_activity.filter(a=>a.event_type==="seller_search").map((a,i)=><tr key={String(a.user_id)+a.created_at+i}><td style={td}>{when(a.created_at)}</td><td style={td}>{a.seller_display_name || a.user_id || "Unknown"}</td><td style={td}>{a.seller_email || (a.event_type === "provider_usage" && !a.user_id ? "System event · no seller account" : "—")}</td><td style={td}>{a.seller_plan}</td><td style={td}>{a.marketplace || "—"}</td><td style={td}>{a.query}</td><td style={td}>{a.result_count}</td><td style={td}>{a.result_status}</td><td style={td}>{a.source || "—"}</td><td style={td}>{a.partner_name || "Direct"}</td></tr>)}</tbody></table>{!data.all_activity.some(a=>a.event_type==="seller_search") && <p style={small}>No seller search events recorded yet.</p>}</div>}

        {tab === "platform activity" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All platform activity</h2><p style={small}>Owner-only event feed combining seller search activity and marketplace provider API usage.</p><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Date","Event","Seller","Email","Marketplace","Details","Results / credits","Status","Partner"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.all_activity.map((a,i)=><tr key={String(a.user_id)+a.created_at+a.event_type+i}><td style={td}>{when(a.created_at)}</td><td style={td}>{a.event_type === "seller_search" ? "Seller search" : "Provider API usage"}</td><td style={td}>{a.seller_display_name || a.user_id || (a.event_type === "provider_usage" ? "System / unassigned" : "Unknown account")}</td><td style={td}>{a.seller_email || "—"}</td><td style={td}>{a.marketplace || "—"}</td><td style={td}>{a.query || a.action || "—"}</td><td style={td}>{a.event_type === "seller_search" ? a.result_count : a.credits_charged ?? 0}</td><td style={td}>{a.result_status}</td><td style={td}>{a.partner_name || "—"}</td></tr>)}</tbody></table>{!data.all_activity.length && <p style={small}>No platform activity recorded yet.</p>}</div>}

        {tab === "api usage" && <div style={{ display: "grid", gap: 16 }}>
          <header><h2 style={{ margin: 0, fontSize: 22 }}>API usage and remaining search credits</h2><p style={small}>Usage and allowance for your registered sellers, with provider calls shown separately from Ekhaya search credits.</p></header>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 13 }}>
            {[
              ["Monthly search allowance", total.monthly_search_allowance],
              ["Search credits used this month", total.monthly_searches_used],
              ["Search credits remaining", total.monthly_searches_remaining],
              ["Provider API calls logged (all time)", total.provider_api_events]
            ].map(([label,value]) => <article key={String(label)} style={panel}><div style={small}>{label}</div><div style={{ fontSize: 25, fontWeight: 800, marginTop: 10 }}>{value}</div></article>)}
          </div>
          <div style={{ ...panel, overflowX: "auto" }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Seller API and search-credit usage</h2>
            <p style={small}>Monthly marketplace search credits are calculated from the active plan allowance and this month’s recorded usage. Provider API calls are counted separately from seller search credits.</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Ekhaya ID","Seller","Email","Plan","Monthly allowance","Used this month","Remaining","Provider API calls (all time)"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.sellers.filter(s=>s.role!=="owner").map(s=><tr key={s.id}><td style={td}><b>{s.account_id || "Pending ID"}</b></td><td style={td}><b>{s.display_name || "Seller"}</b></td><td style={td}>{s.email || "—"}</td><td style={td}>{s.plan_code}</td><td style={td}>{s.monthly_search_allowance}</td><td style={td}>{s.monthly_searches_used}</td><td style={td}><b>{s.monthly_searches_remaining}</b></td><td style={td}>{s.provider_api_calls}</td></tr>)}</tbody></table>
          </div>
          <div style={{ ...panel, borderColor: "#E8D8B5" }}><b>Important distinction</b><p style={{ ...small, marginBottom: 0 }}>Remaining means the seller’s remaining platform search credits for the current month. The connected marketplace provider’s own external account quota is not exposed in the current integration, so it is not represented as a remaining provider quota.</p></div>
        </div>}
        {tab === "partners" && <div style={{ display: "grid", gap: 16 }}>
          <section style={panel}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Register a new partner</h2>
            <p style={small}>Create a separate programme and unique referral code for each partner organisation. New programmes start as pending and do not attribute referrals until they are activated.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Partner organisation name
                <input value={newPartnerName} onChange={e=>setNewPartnerName(e.target.value)} maxLength={120} placeholder="Partner organisation name" style={{ padding: 11, border: "1px solid #DDE6EF", borderRadius: 8 }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Partner slug <span style={small}>Optional · generated from organisation name</span>
                <input value={newPartnerSlug} onChange={e=>setNewPartnerSlug(e.target.value)} maxLength={60} placeholder="partner-name" style={{ padding: 11, border: "1px solid #DDE6EF", borderRadius: 8 }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Referral code <span style={small}>Optional · generated from slug</span>
                <input value={newPartnerReferralCode} onChange={e=>setNewPartnerReferralCode(e.target.value.toUpperCase())} maxLength={24} placeholder="REFERRALCODE" style={{ padding: 11, border: "1px solid #DDE6EF", borderRadius: 8, textTransform: "uppercase" }} />
              </label>
            </div>
            <button onClick={()=>void registerPartner()} disabled={newPartnerBusy || newPartnerName.trim().length < 2} style={{ marginTop: 12, border: 0, borderRadius: 8, padding: "11px 16px", background: "#10243A", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{newPartnerBusy ? "Registering…" : "Register new partner"}</button>
            {newPartnerFeedback && <p role="status" style={{ ...small, marginTop: 10 }}>{newPartnerFeedback}</p>}
          </section>
          <section style={panel}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Invite a partner owner</h2>
            <p style={small}>Select any registered partner programme. The email is personalised with the contact and partner names and expires after 14 days. No email is sent until you press the button.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Partner programme
                <select value={invitePartnerId} onChange={e=>setInvitePartnerId(e.target.value)} style={{ padding: 11, border: "1px solid #DDE6EF", borderRadius: 8, background: "#fff" }}>
                  <option value="">Select a partner</option>
                  {data.partners.filter(p=>!p.partner_user_id).map(p=><option key={p.id} value={p.id}>{p.partner_name} · {p.partner_slug}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Contact person
                <input value={inviteContactName} onChange={e=>setInviteContactName(e.target.value)} maxLength={120} placeholder="Partner contact's full name" style={{ padding: 11, border: "1px solid #DDE6EF", borderRadius: 8 }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Email address
                <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="name@organisation.co.za" style={{ padding: 11, border: "1px solid #DDE6EF", borderRadius: 8 }} />
              </label>
            </div>
            <button onClick={()=>void sendPartnerInvitation()} disabled={inviteBusy || !invitePartnerId || !inviteContactName.trim() || !inviteEmail.includes("@")} style={{ marginTop: 12, border: 0, borderRadius: 8, padding: "11px 16px", background: "#078FC4", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{inviteBusy ? "Sending…" : "Send partner invitation"}</button>
            {inviteFeedback && <p role="status" style={{ ...small, marginTop: 10 }}>{inviteFeedback}</p>}
          </section>
          <section style={{ ...panel, overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All partner accounts</h2><button onClick={()=>void loadPartnerInvitations()} style={{ border: "1px solid #DDE6EF", background: "#fff", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Refresh invitations</button></div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Partner","Referral code","Status","Linked owner user","Go-live date","Created"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.partners.map(p=><tr key={p.id}><td style={td}><b>{p.partner_name}</b><div style={small}>{p.partner_slug}</div></td><td style={td}>{p.referral_code}</td><td style={td}><b>{p.status}</b>{p.status!=="active"&&<div style={{marginTop:7}}><button type="button" onClick={()=>void activatePartner(p.id)} disabled={!p.partner_user_id||activationBusyId===p.id} title={!p.partner_user_id?"Partner owner must accept the invitation first":"Activate this partner programme"} style={{border:0,borderRadius:7,padding:"7px 10px",background:p.partner_user_id?"#16835D":"#E8EDF2",color:p.partner_user_id?"#fff":"#65788A",fontSize:11,fontWeight:700,cursor:p.partner_user_id?"pointer":"not-allowed"}}>{activationBusyId===p.id?"Activating…":p.partner_user_id?"Activate programme":"Awaiting owner"}</button>{!p.partner_user_id&&<div style={{...small,marginTop:5,color:partnerInvitations.some(inv=>inv.partner_id===p.id)?"#9A641B":"#A33B32"}}>{partnerInvitations.some(inv=>inv.partner_id===p.id)?"Invitation recorded; email delivery is not confirmed here.":"No invitation record — no invitation email is recorded as sent."}</div>}</div>}</td><td style={td}>{p.account_id || (p.partner_user_id ? "ET ID pending" : "Not linked")}</td><td style={td}>{when(p.program_live_at)}</td><td style={td}>{when(p.created_at)}</td></tr>)}</tbody></table>
            {activationFeedback && <p role="status" style={{ ...small, marginTop: 10 }}>{activationFeedback}</p>}
            <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Partner invitations</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}><thead><tr>{["Partner","Partner contact","Contact email","Linked Ekhaya account","Invited","Accepted (SAST)","Expires","Status"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{partnerInvitations.map(inv=>{const partner=data.partners.find(p=>p.id===inv.partner_id);return <tr key={inv.id}><td style={td}>{partner?.partner_name || inv.partner_id}<div style={small}>{partner?.referral_code || "Referral code pending"}</div></td><td style={td}>{inv.contact_name || "—"}</td><td style={td}>{inv.invited_email}</td><td style={td}>{partner?.account_id || (partner?.partner_user_id ? "ET ID pending" : inv.status==="accepted"?"Account link pending":"Not linked yet")}</td><td style={td}>{when(inv.invited_at)}</td><td style={td}>{when(inv.accepted_at)}</td><td style={td}>{when(inv.expires_at)}</td><td style={td}>{inv.status}</td></tr>;})}</tbody></table>
            {!partnerInvitations.length && <p style={small}>No invitations loaded yet. Select “Refresh invitations” to check the invitation ledger.</p>}
          </section>
        </div>}

        {tab === "referrals" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All referred sellers</h2><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Partner","Seller","Plan","Account status","Registered","First payment"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.referrals.map(r=><tr key={r.id}><td style={td}>{r.partner_name}</td><td style={td}>{r.seller_display_name || r.referred_user_id}</td><td style={td}>{r.seller_plan}</td><td style={td}>{r.seller_account_status}</td><td style={td}>{when(r.registered_at)}</td><td style={td}>{when(r.first_paid_at)}</td></tr>)}</tbody></table>{!data.referrals.length && <p style={small}>No referred sellers recorded yet.</p>}</div>}

        {tab === "activity" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Partner-referred seller activity</h2><p style={small}>Marketplace searches made by sellers attributed to a partner. This view does not mix in unrelated seller activity.</p><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Date","Partner","Seller","Marketplace","Search query","Results","Status","Source"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.activity.map((a,i)=><tr key={a.user_id+a.created_at+i}><td style={td}>{when(a.created_at)}</td><td style={td}>{a.partner_name}</td><td style={td}>{a.seller_display_name || a.user_id}</td><td style={td}>{a.marketplace}</td><td style={td}>{a.query}</td><td style={td}>{a.result_count}</td><td style={td}>{a.result_status}</td><td style={td}>{a.source}</td></tr>)}</tbody></table>{!data.activity.length && <p style={small}>No partner-referred seller activity recorded yet.</p>}</div>}

        {tab === "commissions" && <div style={{ ...panel, overflowX: "auto" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>All partner commissions</h2><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Payment month","Partner","Plan","Qualifying amount","Rate","Commission","Status","Paid on"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.commissions.map(c=><tr key={c.id}><td style={td}>{when(c.payment_month)}</td><td style={td}>{data.partners.find(p=>p.id===c.partner_id)?.partner_name ?? c.partner_id}</td><td style={td}>{c.plan_code}</td><td style={td}>{money(c.qualifying_amount)}</td><td style={td}>{(Number(c.commission_rate)*100).toFixed(2)}%</td><td style={td}>{money(c.commission_amount)}</td><td style={td}>{c.status}</td><td style={td}>{when(c.paid_at)}</td></tr>)}</tbody></table>{!data.commissions.length && <p style={small}>No commission entries recorded yet.</p>}</div>}
      </>}
      <footer style={{ ...small, marginTop: 24, textAlign: "center" }}>Ekhaya Owner Dashboard · Permanent administration portal · Data is restricted to authorised owner accounts</footer>
    </section>
  </main>;
}
