"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
type Session = { access_token?: string; refresh_token?: string; expires_at?: number; [key: string]: unknown };
type ReportType = "competitor_analysis" | "product_positioning" | "audience_persona" | "swot_analysis" | "marketing_strategy" | "trend_planning";
type Report = { id: string; report_type: ReportType; title: string; product_name: string | null; product_category: string | null; target_market: string | null; seller_context: string; report_content: string; seller_notes: string; created_at: string; updated_at: string };
const reportTypes: { value: ReportType; label: string; feature: "research_query" | "trend_report"; instruction: string }[] = [
  { value: "competitor_analysis", label: "Competitor analysis", feature: "research_query", instruction: "Create a structured competitor analysis. Compare only competitors and observations supplied by the seller. Identify differentiators, gaps, risks and validation questions. Do not invent competitor facts." },
  { value: "product_positioning", label: "Product positioning", feature: "research_query", instruction: "Create a product positioning brief: value proposition, customer problem, differentiators, proof points the seller should gather, positioning statement and messaging angles." },
  { value: "audience_persona", label: "Target audience and customer personas", feature: "research_query", instruction: "Develop practical customer personas from the supplied context. Label assumptions, buying motivations, objections, channels and validation questions." },
  { value: "swot_analysis", label: "SWOT analysis", feature: "research_query", instruction: "Create a SWOT analysis with strengths, weaknesses, opportunities and threats. Separate seller-supplied facts from assumptions and list practical actions." },
  { value: "marketing_strategy", label: "Monthly marketing strategy", feature: "research_query", instruction: "Create a practical 30-day marketing strategy with objectives, audience, positioning, campaign themes, channel mix, weekly actions and measurable KPIs." },
  { value: "trend_planning", label: "Trend-planning report", feature: "trend_report", instruction: "Create a trend-planning report with possible category themes, consumer conversations to investigate, campaign opportunities and a validation checklist. Do not claim these are current or verified trends." },
];
const field: React.CSSProperties = { boxSizing: "border-box", width: "100%", border: "1px solid #DCE8F1", borderRadius: 8, padding: 12, fontSize: 14, color: "#071B31", background: "#fff" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#40566B", fontSize: 12, fontWeight: 700 };
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 22 };
const button: React.CSSProperties = { border: 0, borderRadius: 8, padding: "11px 14px", background: "#079BD3", color: "#fff", fontWeight: 800, cursor: "pointer" };

export default function MarketingIntelligencePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [reportType, setReportType] = useState<ReportType>("competitor_analysis");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [market, setMarket] = useState("South Africa");
  const [competitors, setCompetitors] = useState("");
  const [observations, setObservations] = useState("");
  const [goal, setGoal] = useState("");
  const [generated, setGenerated] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const getHeaders = useCallback(async () => {
    if (!ANON_KEY) throw new Error("Seller account services are not configured.");
    let session: Session | null = null;
    try {
      const raw = localStorage.getItem("ekhaya_session");
      session = raw ? JSON.parse(raw) as Session : null;
    } catch { localStorage.removeItem("ekhaya_session"); }
    if (!session?.access_token || !session.refresh_token) throw new Error("Sign in to access Marketing Intelligence.");
    if (Number(session.expires_at) > Date.now() / 1000 + 60) {
      return { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` };
    }
    const response = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
      localStorage.removeItem("ekhaya_session");
      throw new Error("Your seller sign-in has expired. Please sign in again.");
    }
    const next = { ...session, ...payload, expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in ?? 3600) };
    localStorage.setItem("ekhaya_session", JSON.stringify(next));
    return { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${payload.access_token}` };
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_research_reports?select=*&order=updated_at.desc&limit=50", { headers, cache: "no-store" });
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.message ?? "Unable to load saved reports. The research-report migration must be applied before launch.");
      setReports(body as Report[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load reports."); }
    finally { setLoading(false); }
  }, [getHeaders]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  async function generateReport() {
    const type = reportTypes.find(item => item.value === reportType)!;
    const context = [
      "Report type: " + type.label,
      "Seller product/business: " + (productName.trim() || "Not supplied"),
      "Product category: " + (category.trim() || "Not supplied"),
      "Target market: " + market.trim(),
      "Competitors named by seller (unverified seller input): " + (competitors.trim() || "None supplied"),
      "Seller observations and evidence: " + (observations.trim() || "None supplied"),
      "Business objective: " + (goal.trim() || "Recommend practical next steps"),
      "Specific task: " + type.instruction,
      "Important: identify assumptions and unknowns. Never imply live web research, verified market share, real-time pricing or independently checked competitor claims.",
    ].join("\n\n");
    if (context.length > 2500) { setError("Please shorten the brief. The generation service accepts up to 2,500 characters."); return; }
    setGenerating(true); setError(""); setNotice(""); setGenerated("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/functions/v1/ai-marketing-generate", {
        method: "POST", headers,
        body: JSON.stringify({ feature: type.feature, tone: "clear, commercially practical and evidence-conscious", context }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.content !== "string") throw new Error(payload.error ?? "Report generation is not available yet.");
      setGenerated(payload.content);
      setGeneratedTitle((productName.trim() ? productName.trim() + " — " : "") + type.label);
      setNotice("Report generated. This is AI analysis based on your supplied context, not independently verified live market research.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to generate report."); }
    finally { setGenerating(false); }
  }

  async function saveReport() {
    if (!generated.trim() || !generatedTitle.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const type = reportTypes.find(item => item.value === reportType)!;
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_research_reports", {
        method: "POST", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          report_type: reportType, title: generatedTitle.trim().slice(0, 160),
          product_name: productName.trim() || null, product_category: category.trim() || null,
          target_market: market.trim() || null,
          seller_context: [competitors && "Competitors: " + competitors, observations && "Observations: " + observations, goal && "Goal: " + goal].filter(Boolean).join("\n").slice(0, 5000) || type.label,
          report_content: generated.trim().slice(0, 20000), seller_notes: "",
          evidence_mode: "seller_context_plus_ai_analysis",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? body.msg ?? "Unable to save report. Confirm the research-report migration is included in the next deployment.");
      setGenerated(""); setNotice("Report saved to your private research library.");
      await loadReports();
      if (Array.isArray(body) && body[0]) setSelected(body[0] as Report);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save report."); }
    finally { setSaving(false); }
  }

  async function updateReport() {
    if (!selected) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_research_reports?id=eq." + encodeURIComponent(selected.id), {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ title: selected.title.trim().slice(0, 160), report_content: selected.report_content.slice(0, 20000), seller_notes: notes.slice(0, 5000), updated_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error("Unable to update this report.");
      setNotice("Research report updated."); await loadReports();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update report."); }
    finally { setSaving(false); }
  }

  async function deleteReport(report: Report) {
    if (!window.confirm("Delete this saved research report? This cannot be undone.")) return;
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_research_reports?id=eq." + encodeURIComponent(report.id), { method: "DELETE", headers });
      if (!response.ok) throw new Error("Unable to delete this report.");
      if (selected?.id === report.id) setSelected(null);
      setNotice("Report deleted."); await loadReports();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete report."); }
  }

  function exportReport(report: Report) {
    const text = [report.title, report.report_type.replaceAll("_", " ").toUpperCase(), "Market: " + (report.target_market ?? "Not specified"), "", "EVIDENCE NOTE: AI analysis based on seller-provided context. Not independently verified live market research.", "", report.report_content, "", "SELLER NOTES", report.seller_notes || "None"].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = report.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() + ".txt"; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "24px clamp(18px,5vw,72px) 64px", fontFamily: "Arial,sans-serif" }}>
    <header style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={150} style={{ width: 150, height: "auto" }} priority /></Link>
      <nav style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}><Link href="/account/marketing/" style={{ color: "#079BD3" }}>AI Marketing</Link><Link href="/account/billing/" style={{ color: "#60758A" }}>Billing</Link><Link href="/account/" style={{ color: "#60758A" }}>My account</Link></nav>
    </header>
    <section style={{ maxWidth: 1180, margin: "42px auto 22px" }}>
      <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>EKHAYA AI MARKETING · SELLER GROWTH</p>
      <h1 style={{ fontSize: "clamp(32px,5vw,48px)", letterSpacing: "-.04em", margin: "8px 0" }}>Marketing Intelligence</h1>
      <p style={{ color: "#60758A", lineHeight: 1.7, maxWidth: 760 }}>Turn your product knowledge and market observations into practical competitor, customer and campaign planning reports.</p>
      <div role="note" style={{ padding: 13, borderRadius: 9, background: "#FFF8E8", border: "1px solid #F0DFB6", color: "#76521B", fontSize: 12, lineHeight: 1.6 }}>Evidence boundary: reports are generated from information you provide and AI analysis. They are not live web research, verified competitor intelligence, independently checked prices or confirmed market trends. Validate important decisions before acting.</div>
    </section>
    {error && <div role="alert" style={{ maxWidth: 1180, margin: "0 auto 16px", padding: 13, borderRadius: 9, background: "#FFF1ED", color: "#8A321D" }}>{error}</div>}
    {notice && <div role="status" style={{ maxWidth: 1180, margin: "0 auto 16px", padding: 13, borderRadius: 9, background: "#EAF7FC", color: "#075477" }}>{notice}</div>}
    <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 18 }}>
      <article style={panel}>
        <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>Create a report</h2>
        <div style={{ display: "grid", gap: 13 }}>
          <label style={labelStyle}>Report type<select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} style={field}>{reportTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label style={labelStyle}>Product or business name<input value={productName} onChange={e => setProductName(e.target.value)} maxLength={160} placeholder="e.g. Handmade leather bags" style={field}/></label>
          <label style={labelStyle}>Product category<input value={category} onChange={e => setCategory(e.target.value)} maxLength={160} placeholder="e.g. Fashion accessories" style={field}/></label>
          <label style={labelStyle}>Target market<input value={market} onChange={e => setMarket(e.target.value)} maxLength={160} style={field}/></label>
          <label style={labelStyle}>Competitors and alternatives<textarea value={competitors} onChange={e => setCompetitors(e.target.value)} maxLength={700} rows={3} placeholder="Names and what you know about their offer. These are seller-supplied observations, not verified facts." style={field}/></label>
          <label style={labelStyle}>Your market observations<textarea value={observations} onChange={e => setObservations(e.target.value)} maxLength={900} rows={4} placeholder="Customer feedback, observed price ranges, common questions, strengths, weaknesses or sources you have checked." style={field}/></label>
          <label style={labelStyle}>What do you want to achieve?<textarea value={goal} onChange={e => setGoal(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Find a clearer positioning and improve conversions." style={field}/></label>
          <button type="button" onClick={() => void generateReport()} disabled={generating} style={{ ...button, opacity: generating ? .65 : 1 }}>{generating ? "GENERATING REPORT…" : "GENERATE INTELLIGENCE REPORT"}</button>
        </div>
        {generated && <div style={{ marginTop: 18, borderTop: "1px solid #DCE8F1", paddingTop: 16 }}>
          <label style={labelStyle}>Report title<input value={generatedTitle} onChange={e => setGeneratedTitle(e.target.value)} maxLength={160} style={field}/></label>
          <textarea aria-label="Generated report" value={generated} onChange={e => setGenerated(e.target.value)} maxLength={20000} rows={16} style={{ ...field, marginTop: 12, lineHeight: 1.6, resize: "vertical" }}/>
          <button type="button" onClick={() => void saveReport()} disabled={saving || !generatedTitle.trim()} style={{ ...button, width: "100%", marginTop: 10 }}>{saving ? "SAVING…" : "SAVE TO RESEARCH LIBRARY"}</button>
        </div>}
      </article>
      <article style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ fontSize: 20, margin: 0 }}>Saved research library</h2><button type="button" onClick={() => void loadReports()} disabled={loading} style={{ ...button, background: "#fff", color: "#075477", border: "1px solid #DCE8F1" }}>{loading ? "Loading…" : "Refresh"}</button></div>
        {loading ? <p style={{ color: "#60758A" }}>Loading your reports…</p> : reports.length === 0 ? <p style={{ color: "#60758A", lineHeight: 1.7 }}>No saved reports yet. Create your first report using the form.</p> : <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{reports.map(report => <button key={report.id} type="button" onClick={() => { setSelected(report); setNotes(report.seller_notes ?? ""); }} style={{ textAlign: "left", padding: 13, border: selected?.id === report.id ? "2px solid #079BD3" : "1px solid #DCE8F1", borderRadius: 9, background: "#fff", color: "#071B31", cursor: "pointer" }}><strong>{report.title}</strong><span style={{ display: "block", color: "#60758A", fontSize: 11, marginTop: 5 }}>{report.report_type.replaceAll("_", " ")} · {new Date(report.updated_at).toLocaleDateString("en-ZA")}</span></button>)}</div>}
        {selected && <div style={{ marginTop: 18, borderTop: "1px solid #DCE8F1", paddingTop: 16, display: "grid", gap: 10 }}>
          <label style={labelStyle}>Report title<input value={selected.title} onChange={e => setSelected({ ...selected, title: e.target.value })} maxLength={160} style={field}/></label>
          <label style={labelStyle}>Report content<textarea value={selected.report_content} onChange={e => setSelected({ ...selected, report_content: e.target.value })} maxLength={20000} rows={14} style={{ ...field, lineHeight: 1.6, resize: "vertical" }}/></label>
          <label style={labelStyle}>Private seller notes<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} rows={4} style={field}/></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => void updateReport()} disabled={saving} style={button}>SAVE CHANGES</button><button type="button" onClick={() => exportReport({ ...selected, seller_notes: notes })} style={{ ...button, background: "#fff", color: "#075477", border: "1px solid #DCE8F1" }}>EXPORT .TXT</button><button type="button" onClick={() => void deleteReport(selected)} style={{ ...button, background: "#FFF1ED", color: "#8A321D" }}>DELETE</button></div>
        </div>}
      </article>
    </section>
    <p style={{ maxWidth: 1180, margin: "20px auto 0", color: "#71869A", fontSize: 11, lineHeight: 1.6 }}>Reports use the existing Marketing research or trend allowance. No additional research API is connected. Saving and history require the new database migration to be applied during the approved deployment process.</p>
  </main>;
}
