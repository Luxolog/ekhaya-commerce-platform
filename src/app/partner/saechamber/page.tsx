"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Session = { access_token: string; user?: { id?: string; email?: string } };
type Partner = { id: string; partner_name: string; partner_slug: string; referral_code: string; status: string; program_live_at: string | null };
type Referral = { id: string; referred_user_id: string; registered_at: string; first_paid_at: string | null };
type Commission = { id: string; payment_month: string; plan_code: string; qualifying_amount: number; active_referred_sellers: number; commission_band: number; commission_rate: number; commission_amount: number; status: string; paid_at: string | null };
type Statement = { id: string; statement_month: string; active_referred_sellers: number; qualifying_revenue: number; commission_total: number; adjustment_total: number; payment_due_date: string; status: string; paid_at: string | null };
type Invitation = { id: string; invited_email: string; status: string; invited_at: string; expires_at: string };

const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value || 0);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "—";
const card: React.CSSProperties = { background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 20 };
const muted: React.CSSProperties = { color: "#60758A", fontSize: 12 };

export default function SAeChamberPartnerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "referrals" | "commissions" | "statements">("overview");
  const [isOwner, setIsOwner] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const referralUrl = typeof window !== "undefined" ? window.location.origin + "/account/?ref=SAECHAMBER" : "/account/?ref=SAECHAMBER";

  const api = useCallback(async (path: string) => {
    if (!session?.access_token) throw new Error("Please sign in first.");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.error || "Unable to load partner information.");
    return body;
  }, [session]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ekhaya_session");
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      localStorage.removeItem("ekhaya_session");
    }
  }, []);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    let live = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        if (!userResponse.ok) throw new Error("Your sign-in session has expired. Please sign in again.");
        const user = await userResponse.json();
        const ownerRows = await api(`partner_owner_access?select=user_id&user_id=eq.${user.id}&limit=1`);
        const ownerMode = (ownerRows as {user_id:string}[]).length > 0;
        if (!live) return;
        setIsOwner(ownerMode);
        const partners = ownerMode
          ? await api("partner_programs?select=id,partner_name,partner_slug,referral_code,status,program_live_at&partner_slug=eq.saechamber&limit=1")
          : await api(`partner_programs?select=id,partner_name,partner_slug,referral_code,status,program_live_at&partner_user_id=eq.${user.id}&limit=1`);
        if (!live) return;
        const current = (partners as Partner[])[0] ?? null;
        setPartner(current);
        if (!current) return;
        const [r, c, s, inv] = await Promise.all([
          api(`partner_referrals?select=id,referred_user_id,registered_at,first_paid_at&partner_id=eq.${current.id}&order=registered_at.desc`),
          api(`partner_commission_ledger?select=id,payment_month,plan_code,qualifying_amount,active_referred_sellers,commission_band,commission_rate,commission_amount,status,paid_at&partner_id=eq.${current.id}&order=payment_month.desc,created_at.desc`),
          api(`partner_monthly_statements?select=id,statement_month,active_referred_sellers,qualifying_revenue,commission_total,adjustment_total,payment_due_date,status,paid_at&partner_id=eq.${current.id}&order=statement_month.desc`),
          ownerMode ? api(`partner_invitations?select=id,invited_email,status,invited_at,expires_at&partner_id=eq.${current.id}&order=invited_at.desc`) : Promise.resolve([]),
        ]);
        if (!live) return;
        setReferrals(r as Referral[]); setCommissions(c as Commission[]); setStatements(s as Statement[]); setInvitations(inv as Invitation[]);
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "Unable to load the partner dashboard."); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [session, api]);

  const totals = useMemo(() => ({
    registered: referrals.length,
    paying: referrals.filter(x => x.first_paid_at).length,
    earned: commissions.filter(x => x.status !== "reversed").reduce((n, x) => n + Number(x.commission_amount), 0),
    pending: commissions.filter(x => x.status === "pending" || x.status === "approved").reduce((n, x) => n + Number(x.commission_amount), 0),
    paid: commissions.filter(x => x.status === "paid").reduce((n, x) => n + Number(x.commission_amount), 0),
  }), [referrals, commissions]);

  async function sendInvitation() {
    if (!session?.access_token || !inviteEmail.trim()) return;
    setInviting(true); setInviteMessage("");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-saechamber-partner`, { method: "POST", headers: { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail.trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Invitation could not be sent.");
      setInviteMessage(`Invitation sent to ${result.invited_email}. It expires in 14 days.`); setInviteEmail("");
      const updated = await api(`partner_invitations?select=id,invited_email,status,invited_at,expires_at&partner_id=eq.${partner?.id}&order=invited_at.desc`);
      setInvitations(updated as Invitation[]);
    } catch (e) { setInviteMessage(e instanceof Error ? e.message : "Invitation could not be sent."); }
    finally { setInviting(false); }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) return <main style={{ minHeight: "100vh", padding: 32, color: "#071B31" }}>Loading SA eChamber partner portal…</main>;

  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "28px clamp(16px,4vw,56px) 60px" }}>
    <header style={{ maxWidth: 1240, margin: "0 auto 34px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <div><Link href="/" style={{ color: "#079BD3", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>EKHAYA TECHNOLOGIES</Link><div style={{ fontSize: 25, fontWeight: 800, marginTop: 7 }}>SA eChamber Partner Portal</div><div style={muted}>Referral performance · Commission transparency</div></div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}><Link href="/account/" style={{ color: "#079BD3", fontWeight: 700, fontSize: 13 }}>Seller account</Link><button onClick={() => { localStorage.removeItem("ekhaya_session"); window.location.href = "/account/"; }} style={{ border: "1px solid #DCE8F1", background: "#fff", borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>Sign out</button></div>
    </header>
    <section style={{ maxWidth: 1240, margin: "0 auto" }}>
      {error && <div role="alert" style={{ ...card, borderColor: "#E6B7B7", color: "#8A2525", marginBottom: 18 }}>{error}</div>}
      {!session && <div style={{ ...card, maxWidth: 560, margin: "50px auto", textAlign: "center" }}><h1 style={{ marginTop: 0 }}>Partner sign-in required</h1><p style={muted}>Sign in using the SA eChamber partner account authorised by Ekhaya Technologies.</p><Link href="/account/" style={{ display: "inline-block", background: "#079BD3", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 700 }}>Go to sign in</Link></div>}
      {session && !partner && <div style={{ ...card, maxWidth: 720, margin: "50px auto" }}><p style={{ color: "#079BD3", fontWeight: 800, letterSpacing: 1, fontSize: 11 }}>PARTNER ACCESS SETUP</p><h1 style={{ marginTop: 0 }}>Your partner account is not linked yet</h1><p style={{ color: "#60758A", lineHeight: 1.7 }}>Your login is valid, but it has not yet been assigned to the SA eChamber partner record. Ekhaya must verify the authorised Chamber contact and link this account before referral and commission information becomes visible. This is the permanent partner portal; this address will remain the dedicated access point for SA eChamber.</p><p style={{ ...muted, marginBottom: 4 }}>Partner referral code</p><strong>SAECHAMBER</strong><p style={{ ...muted, marginTop: 18 }}>For security, referral and commission data will appear once the authorised Chamber login is linked to this partner record.</p><Link href="/account/" style={{ color: "#079BD3", fontWeight: 700 }}>Return to account →</Link></div>}
      {session && partner && <>
        {isOwner && <div style={{ ...card, borderColor: "#079BD3", marginBottom: 18 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong style={{ color: "#079BD3" }}>EKHAYA OWNER VIEW</strong><p style={{ ...muted, margin: "6px 0 0" }}>You are viewing the partner dashboard with the same figures and tabs the SA eChamber owner will see. Administrative controls are shown separately below.</p></div><span style={{ fontSize: 12, fontWeight: 700 }}>Read-only partner preview</span></div><div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #DCE8F1" }}><strong>Invite SA eChamber owner</strong><p style={muted}>They will receive a secure email invitation, accept it, create their own sign-in and choose their referral link code.</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Chamber owner email address" style={{ flex: "1 1 250px", minWidth: 0, padding: 11, border: "1px solid #DCE8F1", borderRadius: 8 }} /><button onClick={sendInvitation} disabled={inviting || !inviteEmail.includes("@")} style={{ background: "#079BD3", color: "#fff", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>{inviting ? "Sending…" : "Send invitation"}</button></div>{inviteMessage && <p role="status" style={{ ...muted, marginTop: 8 }}>{inviteMessage}</p>}{invitations.length > 0 && <div style={{ marginTop: 12, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr>{["Invited email","Sent","Expires","Status"].map(v=><th key={v} style={{ textAlign: "left", padding: 8, background: "#F4F8FC" }}>{v}</th>)}</tr></thead><tbody>{invitations.map(i=><tr key={i.id}>{[i.invited_email,date(i.invited_at),date(i.expires_at),i.status].map((v,n)=><td key={n} style={{ padding: 8, borderBottom: "1px solid #DCE8F1" }}>{v}</td>)}</tr>)}</tbody></table></div>}</div></div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div><p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 1, margin: "0 0 6px" }}>PARTNER OVERVIEW</p><h1 style={{ fontSize: 32, margin: 0 }}>{partner.partner_name}</h1><p style={muted}>Programme status: {partner.status} · Launch date: {date(partner.program_live_at)}</p></div>
          <div style={{ ...card, minWidth: 320, flex: "0 1 430px" }}><div style={{ fontWeight: 800, marginBottom: 7 }}>Your unique seller onboarding link</div><div style={{ background: "#F4F8FC", border: "1px solid #DCE8F1", padding: 11, borderRadius: 8, fontSize: 12, overflowWrap: "anywhere" }}>{referralUrl}</div>{partner.status === "active" ? <button onClick={copyLink} style={{ marginTop: 10, background: "#079BD3", color: "#fff", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>{copied ? "Copied" : "Copy referral link"}</button> : <p style={{ ...muted, marginBottom: 0 }}>The permanent referral link will be enabled once the authorised partner account is activated.</p>}</div>
        </div>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>{(["overview","referrals","commissions","statements"] as const).map(x => <button key={x} onClick={() => setTab(x)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #DCE8F1", background: tab === x ? "#071B31" : "#fff", color: tab === x ? "#fff" : "#40566B", textTransform: "capitalize", fontWeight: 700, cursor: "pointer" }}>{x}</button>)}</nav>
        {tab === "overview" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 }}>
            {[["Registered sellers", totals.registered],["Active paying referred sellers",totals.paying],["Commission earned",money(totals.earned)],["Pending / approved",money(totals.pending)],["Commission paid",money(totals.paid)]].map(([label,value])=><article key={String(label)} style={card}><div style={muted}>{label}</div><div style={{ fontSize: 25, fontWeight: 800, marginTop: 12 }}>{value}</div></article>)}
          </div>
          <div style={{ ...card, marginBottom: 18 }}><h2 style={{ fontSize: 18, marginTop: 0 }}>Commission schedule</h2><p style={muted}>First 3 months: launch accelerator. Thereafter: month-end active paying referred-seller band.</p><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Active paying sellers","Beginner R49","Starter R99","Growth R149","Pro R199"].map(x=><th key={x} style={{ textAlign: "left", padding: 11, background: "#071B31", color: "#fff" }}>{x}</th>)}</tr></thead><tbody>{[["1–100","10%","12%","15%","15%"],["101–250","15%","15%","18%","18%"],["251–500","18%","18%","20%","20%"],["501+","20%","20%","20%","20%"]].map(row=><tr key={row[0]}>{row.map((v,i)=><td key={i} style={{ padding: 11, borderBottom: "1px solid #DCE8F1", fontWeight: i===0?700:500 }}>{v}</td>)}</tr>)}</tbody></table></div><p style={muted}>Launch accelerator: Beginner 13% · Starter 15% · Growth 18% · Pro 18%. Commission is based on qualifying amounts actually received, excluding refunds, reversals, chargebacks and failed payments.</p></div>
          <div style={card}><h2 style={{ fontSize: 18, marginTop: 0 }}>Latest commission activity</h2><CommissionTable rows={commissions.slice(0,6)} /></div>
        </>}
        {tab === "referrals" && <div style={card}><h2 style={{ marginTop: 0 }}>Referred sellers</h2><p style={muted}>Seller identity details are not displayed here; this view provides referral attribution and first-payment status.</p>{referrals.length === 0 ? <p style={muted}>No referrals have been recorded yet.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Referral reference","Registered","First successful payment","Status"].map(x=><th key={x} style={{ textAlign: "left", padding: 10, background: "#071B31", color: "#fff" }}>{x}</th>)}</tr></thead><tbody>{referrals.map((r,i)=><tr key={r.id}><td style={{ padding: 11, borderBottom: "1px solid #DCE8F1" }}>Seller {String(i+1).padStart(3,"0")}</td><td style={{ padding: 11, borderBottom: "1px solid #DCE8F1" }}>{date(r.registered_at)}</td><td style={{ padding: 11, borderBottom: "1px solid #DCE8F1" }}>{date(r.first_paid_at)}</td><td style={{ padding: 11, borderBottom: "1px solid #DCE8F1" }}>{r.first_paid_at ? "Paying history recorded" : "Registered"}</td></tr>)}</tbody></table></div>}</div>}
        {tab === "commissions" && <div style={card}><h2 style={{ marginTop: 0 }}>Commission ledger</h2><CommissionTable rows={commissions} /></div>}
        {tab === "statements" && <div style={card}><h2 style={{ marginTop: 0 }}>Monthly statements</h2>{statements.length === 0 ? <p style={muted}>Monthly statements will appear here after reconciliation.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Month","Active sellers","Qualifying revenue","Commission","Due on","Status"].map(x=><th key={x} style={{ textAlign: "left", padding: 10, background: "#071B31", color: "#fff" }}>{x}</th>)}</tr></thead><tbody>{statements.map(s=><tr key={s.id}>{[date(s.statement_month),String(s.active_referred_sellers),money(Number(s.qualifying_revenue)),money(Number(s.commission_total)+Number(s.adjustment_total)),date(s.payment_due_date),s.status].map((v,i)=><td key={i} style={{ padding: 11, borderBottom: "1px solid #DCE8F1" }}>{v}</td>)}</tr>)}</tbody></table></div>}</div>}
      </>}
      <footer style={{ ...muted, marginTop: 28, textAlign: "center" }}>SA eChamber can raise statement reconciliation queries within 60 days. Monthly payment date: 7th of the month.</footer>
    </section>
  </main>;
}

function CommissionTable({ rows }: { rows: Commission[] }) {
  if (!rows.length) return <p style={muted}>No commission transactions have been reconciled yet.</p>;
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Payment month","Plan","Qualifying amount","Active sellers / band","Rate","Commission","Status"].map(x=><th key={x} style={{ textAlign: "left", padding: 10, background: "#071B31", color: "#fff" }}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{[date(r.payment_month),r.plan_code,money(Number(r.qualifying_amount)),`${r.active_referred_sellers} / Band ${r.commission_band}`,`${(Number(r.commission_rate)*100).toFixed(2)}%`,money(Number(r.commission_amount)),r.status].map((v,i)=><td key={i} style={{ padding: 11, borderBottom: "1px solid #DCE8F1" }}>{v}</td>)}</tr>)}</tbody></table></div>;
}
