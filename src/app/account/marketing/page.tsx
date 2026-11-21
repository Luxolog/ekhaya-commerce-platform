"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const CHECKOUT_UI_ENABLED = false;

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
type Campaign = { id: string; title: string; objective?: string | null; platform?: string | null; content?: string | null; status: string; updated_at: string };
type CalendarPost = { id: string; title: string; content: string; platform: string; scheduled_for: string; status: "draft" | "approved" | "archived" };

const money = (amount: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(amount);
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "Not started";

export default function MarketingDashboardPage() {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [subscriptions, setSubscriptions] = useState<MarketingSubscription[]>([]);
  const [usage, setUsage] = useState<UsageEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingCampaignTitle, setEditingCampaignTitle] = useState("");
  const [editingCampaignContent, setEditingCampaignContent] = useState("");
  const [editingCampaignPlatform, setEditingCampaignPlatform] = useState("instagram");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [generatorFeature, setGeneratorFeature] = useState("ai_post");
  const [contentFormat, setContentFormat] = useState("social_post");
  const [generatorTone, setGeneratorTone] = useState("friendly and professional");
  const [generatorContext, setGeneratorContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationUsage, setGenerationUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [weeklyContext, setWeeklyContext] = useState("");
  const [weeklyPlatform, setWeeklyPlatform] = useState("instagram");
  const [weeklyTone, setWeeklyTone] = useState("friendly and professional");
  const [weeklyBusy, setWeeklyBusy] = useState(false);

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
      const [plans, subs, drafts] = await Promise.all([
        get<MarketingPlan>("marketing_plans?select=code,name,price_zar,billing_interval,monthly_ai_posts,monthly_campaign_ideas,monthly_research_queries,monthly_trend_reports&is_active=eq.true&order=price_zar.asc"),
        get<MarketingSubscription>("seller_marketing_subscriptions?select=id,plan_code,status,billing_mode,current_period_start,current_period_end,created_at&order=created_at.desc&limit=10"),
        get<Campaign>("marketing_campaigns?select=id,title,objective,platform,content,status,updated_at&order=updated_at.desc&limit=20"),
      ]);
      const active = subs.find(item => item.status === "active");
      const usageStart = active?.current_period_start ?? from;
      const events = await get<UsageEvent>("marketing_usage_events?select=feature_code,quantity,created_at&created_at=gte." + encodeURIComponent(usageStart) + "&order=created_at.desc&limit=500");
      setPlan(plans.find(item => item.code === "marketing_mini") ?? plans[0] ?? null);
      setSubscriptions(subs);
      setUsage(events);
      setCampaigns(drafts);
      const calendar = await get<CalendarPost>("marketing_calendar_posts?select=id,title,content,platform,scheduled_for,status&order=scheduled_for.asc&limit=50");
      setCalendarPosts(calendar);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load AI Marketing.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("payment") === "return") {
      setNotice("Payment return received. Your subscription will only activate after the Paystack webhook independently verifies successful payment. Refresh shortly to check your access.");
    }
    void load();
  }, [load]);

  const activeSubscription = subscriptions.find(item => item.status === "active") ?? null;
  const usageTotals = useMemo(() => usage.reduce((totals, event) => {
    totals[event.feature_code] = (totals[event.feature_code] ?? 0) + Number(event.quantity || 0);
    return totals;
  }, {} as Record<string, number>), [usage]);

  async function startCheckout() {
    setBusy(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/functions/v1/paystack-marketing-billing", {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: plan?.code ?? "marketing_mini" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.authorization_url !== "string") {
        throw new Error(payload.error ?? "Checkout is not available yet.");
      }
      window.location.assign(payload.authorization_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  async function generateContent() {
    setGenerating(true); setError(""); setNotice(""); setGeneratedContent(""); setGenerationUsage(null);
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/functions/v1/ai-marketing-generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          feature: generatorFeature,
          content_format: contentFormat,
          platform,
          tone: generatorTone,
          context: generatorContext.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.content !== "string") {
        throw new Error(payload.error ?? "Content generation is not available yet.");
      }
      setGeneratedContent(payload.content);
      setGeneratedTitle(generatorFeature === "ai_post" ? ({
        social_post: "AI social post",
        tiktok_script: "TikTok video script",
        product_description: "Product description",
        promotional_message: "Promotional message",
        email_copy: "Marketing email",
        campaign_headline: "Campaign headlines",
        call_to_action: "Call-to-action options",
        hashtag_suggestions: "Hashtag suggestions",
      } as Record<string, string>)[contentFormat] ?? "AI marketing content" : generatorFeature === "campaign_idea" ? "AI campaign idea" : generatorFeature === "research_query" ? "Marketing research brief" : "Trend planning brief");
      setGenerationUsage(payload.usage ?? null);
      setNotice("Your draft is ready. Review it carefully before publishing.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate marketing content.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveGeneratedDraft() {
    if (!generatedContent || !generatedTitle.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_campaigns", {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          title: generatedTitle.trim().slice(0, 100),
          objective: generatorContext.trim().slice(0, 1000),
          platform: generatorFeature === "ai_post" ? platform : null,
          content: generatedContent,
          status: "draft",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? payload.msg ?? "Unable to save this generated draft.");
      setNotice("Generated content saved to your campaign workspace.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save this generated draft.");
    } finally {
      setBusy(false);
    }
  }

  async function generateWeeklyPlan() {
    setWeeklyBusy(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/functions/v1/ai-marketing-weekly-plan", {
        method: "POST", headers,
        body: JSON.stringify({ context: weeklyContext.trim(), platform: weeklyPlatform, tone: weeklyTone }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.posts) || payload.posts.length !== 7) {
        throw new Error(payload.error ?? "Unable to create your seven-day plan.");
      }
      setNotice("Your seven-day plan has been saved as drafts. Seven AI post credits were used. Review and approve each post before using it.");
      setWeeklyContext("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate weekly content.");
    } finally { setWeeklyBusy(false); }
  }

  async function updateCalendarPost(post: CalendarPost, status: "approved" | "draft") {
    setBusy(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_calendar_posts?id=eq." + encodeURIComponent(post.id), {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ status, approved_at: status === "approved" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.message ?? "Unable to update post approval."); }
      setNotice(status === "approved" ? "Post marked as seller-approved. It has not been published or sent to a platform." : "Post returned to draft.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update post."); }
    finally { setBusy(false); }
  }

  async function copyGeneratedContent() {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setNotice("Generated content copied to your clipboard.");
    } catch {
      setError("Clipboard access is unavailable in this browser. Select and copy the generated text manually.");
    }
  }

  function beginCampaignEdit(campaign: Campaign) {
    setEditingCampaignId(campaign.id);
    setEditingCampaignTitle(campaign.title);
    setEditingCampaignContent(campaign.content ?? "");
    setEditingCampaignPlatform(campaign.platform ?? "instagram");
    setError("");
    setNotice("");
  }

  async function saveCampaignEdit(campaignId: string) {
    if (!editingCampaignTitle.trim() || !editingCampaignContent.trim()) {
      setError("Campaign title and content are required.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch(SUPABASE_URL + "/rest/v1/marketing_campaigns?id=eq." + encodeURIComponent(campaignId), {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          title: editingCampaignTitle.trim().slice(0, 100),
          content: editingCampaignContent.trim().slice(0, 10000),
          platform: editingCampaignPlatform,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.message ?? detail.msg ?? "Unable to update campaign.");
      }
      setEditingCampaignId(null);
      setNotice("Campaign updated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update campaign.");
    } finally {
      setBusy(false);
    }
  }

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
        <Link href="/account/marketing/intelligence/" style={{ color: "#079BD3" }}>Marketing Intelligence</Link>
        <Link href="/account/marketing/guide/" style={{ color: "#60758A" }}>Help centre</Link>
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
        <button type="button" onClick={() => void startCheckout()} disabled={!CHECKOUT_UI_ENABLED || busy || !!activeSubscription} style={{ width: "100%", padding: 13, marginTop: 16, border: 0, borderRadius: 8, background: !CHECKOUT_UI_ENABLED || activeSubscription ? "#7890A3" : "#079BD3", color: "#fff", fontWeight: 800, cursor: !CHECKOUT_UI_ENABLED || activeSubscription ? "not-allowed" : "pointer" }}>{activeSubscription ? "SUBSCRIPTION ACTIVE" : busy ? "PLEASE WAIT…" : CHECKOUT_UI_ENABLED ? "SUBSCRIBE FOR R29 / MONTH" : "PAYMENTS NOT YET ENABLED"}</button>
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
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 20, margin: "0 0 8px" }}>AI content studio</h2>
        <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>Generate a first draft for your marketing. Your monthly allowance is checked securely before generation.</p>
        {!activeSubscription ? <div style={{ padding: 14, background: "#F4F8FC", borderRadius: 9, color: "#60758A", fontSize: 12, lineHeight: 1.6 }}>Activate Marketing Mini to unlock AI content generation. Checkout remains disabled until payment approval and testing are complete.</div> : <div style={{ display: "grid", gap: 10 }}>
          <label style={formLabel}>What do you want to create?
            <select value={generatorFeature} onChange={event => { setGeneratorFeature(event.target.value); setGeneratedContent(""); }} style={field}>
              <option value="ai_post">Social media post</option>
              <option value="campaign_idea">Campaign idea</option>
              <option value="research_query">Marketing research brief</option>
              <option value="trend_report">Trend planning brief</option>
            </select>
          </label>
          {generatorFeature === "ai_post" && <label style={formLabel}>Social platform
            <select value={platform} onChange={event => setPlatform(event.target.value)} style={field}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="other">Other</option></select>
          </label>}
          {generatorFeature === "ai_post" && <label style={formLabel}>Content format
            <select value={contentFormat} onChange={event => { setContentFormat(event.target.value); setGeneratedContent(""); }} style={field}>
              <option value="social_post">Social post / Instagram caption</option>
              <option value="tiktok_script">TikTok video script</option>
              <option value="product_description">Product description</option>
              <option value="promotional_message">Promotional message</option>
              <option value="email_copy">Email marketing copy</option>
              <option value="campaign_headline">Campaign headlines</option>
              <option value="call_to_action">Calls to action</option>
              <option value="hashtag_suggestions">Hashtag suggestions</option>
            </select>
          </label>}
          <label style={formLabel}>Writing tone
            <select value={generatorTone} onChange={event => setGeneratorTone(event.target.value)} style={field}><option value="friendly and professional">Friendly and professional</option><option value="bold and persuasive">Bold and persuasive</option><option value="premium and sophisticated">Premium and sophisticated</option><option value="warm and community-focused">Warm and community-focused</option><option value="informative and educational">Informative and educational</option></select>
          </label>
          <label style={formLabel}>Tell us about your product, audience or goal
            <textarea value={generatorContext} onChange={event => setGeneratorContext(event.target.value)} maxLength={2500} rows={5} placeholder="Example: We sell handmade leather bags in South Africa. Our audience is working professionals looking for durable everyday bags. We want to introduce our new collection." style={{ ...field, height: "auto", padding: 12, resize: "vertical" }}/>
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#71869A", fontSize: 11 }}><span>Minimum 12 characters · Maximum 2,500</span><span>{generatorContext.length}/2,500</span></div>
          <button type="button" onClick={() => void generateContent()} disabled={generating || generatorContext.trim().length < 12} style={{ padding: 13, border: 0, borderRadius: 8, background: generating || generatorContext.trim().length < 12 ? "#9FB5C5" : "#079BD3", color: "#fff", fontWeight: 800, cursor: generating ? "wait" : "pointer" }}>{generating ? "GENERATING…" : "GENERATE CONTENT"}</button>
          {generatedContent && <div style={{ marginTop: 8, border: "1px solid #DCE8F1", borderRadius: 10, padding: 15, background: "#F8FBFD" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}><strong style={{ fontSize: 13 }}>Your generated draft</strong><button type="button" onClick={() => void copyGeneratedContent()} style={{ border: "1px solid #DCE8F1", borderRadius: 7, background: "#fff", padding: "7px 10px", color: "#075477", fontWeight: 700, cursor: "pointer" }}>Copy draft</button></div>
            <label style={formLabel}>Draft title
              <input value={generatedTitle} onChange={event => setGeneratedTitle(event.target.value)} maxLength={100} style={field}/>
            </label>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, color: "#304B63", margin: "12px 0 0" }}>{generatedContent}</pre>
            <button type="button" onClick={() => void saveGeneratedDraft()} disabled={busy || !generatedTitle.trim()} style={{ width: "100%", padding: 11, marginTop: 12, border: "1px solid #079BD3", borderRadius: 8, background: "#fff", color: "#075477", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}>{busy ? "SAVING…" : "SAVE TO CAMPAIGN WORKSPACE"}</button>
            {generationUsage && <p style={{ color: "#71869A", fontSize: 11, margin: "12px 0 0" }}>This month: {generationUsage.used}/{generationUsage.limit} used · {generationUsage.remaining} remaining for this tool.</p>}
            <p style={{ color: "#71869A", fontSize: 11, lineHeight: 1.5, margin: "12px 0 0" }}>AI-generated content is a draft. Check product details, prices and claims before publishing.</p>
          </div>}
        </div>}
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
      {loading ? <p style={{ color: "#60758A", fontSize: 13 }}>Loading marketing workspace…</p> : campaigns.length ? <div style={{ overflowX: "auto", marginTop: 12 }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}><thead><tr>{["Campaign","Platform","Status","Last updated"].map(label => <th key={label} style={{ padding: 10, color: "#60758A", borderBottom: "1px solid #DCE8F1" }}>{label}</th>)}</tr></thead><tbody>{campaigns.map(campaign => <tr key={campaign.id}><td colSpan={4} style={{ padding: 12, borderBottom: "1px solid #EEF3F7" }}>{editingCampaignId === campaign.id ? <div style={{ display: "grid", gap: 9 }}><input aria-label="Campaign title" value={editingCampaignTitle} onChange={event => setEditingCampaignTitle(event.target.value)} maxLength={100} style={field}/><select aria-label="Campaign platform" value={editingCampaignPlatform} onChange={event => setEditingCampaignPlatform(event.target.value)} style={field}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="other">Other</option></select><textarea aria-label="Campaign content" value={editingCampaignContent} onChange={event => setEditingCampaignContent(event.target.value)} maxLength={10000} rows={6} style={{ ...field, height: "auto", padding: 12, resize: "vertical" }}/><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy} onClick={() => void saveCampaignEdit(campaign.id)} style={{ padding: "8px 12px", border: 0, borderRadius: 7, background: "#079BD3", color: "#fff", fontWeight: 800 }}>{busy ? "SAVING…" : "SAVE CHANGES"}</button><button type="button" onClick={() => setEditingCampaignId(null)} style={{ padding: "8px 12px", border: "1px solid #DCE8F1", borderRadius: 7, background: "#fff", color: "#075477", fontWeight: 700 }}>CANCEL</button></div></div> : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(90px,.7fr) minmax(90px,.7fr) minmax(130px,.8fr)", gap: 12, alignItems: "start" }}><div><strong>{campaign.title}</strong><p style={{ color: "#71869A", fontWeight: 400, lineHeight: 1.5, maxWidth: 460, whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "6px 0" }}>{campaign.content ? campaign.content.slice(0, 220) + (campaign.content.length > 220 ? "…" : "") : campaign.objective ?? "No content attached."}</p><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{campaign.content && <button type="button" onClick={() => void navigator.clipboard.writeText(campaign.content ?? "").then(() => setNotice("Campaign content copied."), () => setError("Clipboard access unavailable."))} style={{ border: "1px solid #DCE8F1", borderRadius: 7, background: "#fff", padding: "6px 9px", color: "#075477", fontWeight: 700, cursor: "pointer" }}>Copy content</button>}<button type="button" onClick={() => beginCampaignEdit(campaign)} style={{ border: "1px solid #DCE8F1", borderRadius: 7, background: "#fff", padding: "6px 9px", color: "#075477", fontWeight: 700, cursor: "pointer" }}>Edit draft</button></div></div><span>{campaign.platform ? pretty(campaign.platform) : "—"}</span><span>{pretty(campaign.status)}</span><span>{date(campaign.updated_at)}</span></div>}</td></tr>)}</tbody></table></div> : <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 14 }}>No campaign drafts yet.</p>}
    </section>

    <section style={{ maxWidth: 1180, margin: "22px auto 0", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24 }}>
      <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 20, margin: "0 0 8px" }}>Seven-day content calendar</h2>
      <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>Create a week of platform-specific posts in one go. A complete plan uses seven AI social-post credits. Posts are saved as drafts; you review and approve them. Approval does not publish or schedule them externally.</p>
      {!activeSubscription ? <p style={{ color: "#71869A", fontSize: 12 }}>An active Marketing subscription is required to generate a calendar.</p> : <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
        <label style={formLabel}>Business, product, audience and weekly goal
          <textarea value={weeklyContext} onChange={event => setWeeklyContext(event.target.value)} maxLength={2500} rows={4} placeholder="Describe what you sell, who you want to reach and what this week’s content should achieve." style={{ ...field, height: "auto", padding: 12, resize: "vertical" }}/>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <label style={formLabel}>Platform<select value={weeklyPlatform} onChange={event => setWeeklyPlatform(event.target.value)} style={field}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="other">Other</option></select></label>
          <label style={formLabel}>Tone<select value={weeklyTone} onChange={event => setWeeklyTone(event.target.value)} style={field}><option value="friendly and professional">Friendly and professional</option><option value="bold and persuasive">Bold and persuasive</option><option value="premium and sophisticated">Premium and sophisticated</option><option value="warm and community-focused">Warm and community-focused</option><option value="informative and educational">Informative and educational</option></select></label>
        </div>
        <button type="button" onClick={() => void generateWeeklyPlan()} disabled={weeklyBusy || weeklyContext.trim().length < 12} style={{ padding: 13, border: 0, borderRadius: 8, background: weeklyBusy || weeklyContext.trim().length < 12 ? "#9FB5C5" : "#079BD3", color: "#fff", fontWeight: 800 }}>{weeklyBusy ? "BUILDING YOUR WEEK…" : "GENERATE 7-DAY CONTENT PLAN · 7 CREDITS"}</button>
      </div>}
      <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
        {calendarPosts.length ? calendarPosts.map(post => <article key={post.id} style={{ border: "1px solid #DCE8F1", borderRadius: 10, padding: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong>{post.title}</strong><span style={{ fontSize: 11, color: post.status === "approved" ? "#147A46" : "#60758A", fontWeight: 800 }}>{pretty(post.status)}</span></div>
          <p style={{ color: "#71869A", fontSize: 11, margin: "6px 0" }}>{pretty(post.platform)} · {date(post.scheduled_for)}</p>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#40566B", fontSize: 13, lineHeight: 1.65 }}>{post.content}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void navigator.clipboard.writeText(post.content).then(() => setNotice("Post copied."), () => setError("Clipboard access unavailable."))} style={{ padding: "8px 11px", border: "1px solid #DCE8F1", borderRadius: 7, background: "#fff", color: "#075477", fontWeight: 700 }}>Copy post</button>
            {post.status === "draft" ? <button type="button" disabled={busy} onClick={() => void updateCalendarPost(post, "approved")} style={{ padding: "8px 11px", border: 0, borderRadius: 7, background: "#E8F6EE", color: "#147A46", fontWeight: 700 }}>Approve post</button> : <button type="button" disabled={busy} onClick={() => void updateCalendarPost(post, "draft")} style={{ padding: "8px 11px", border: "1px solid #DCE8F1", borderRadius: 7, background: "#fff", color: "#075477", fontWeight: 700 }}>Return to draft</button>}
          </div>
        </article>) : <p style={{ color: "#71869A", fontSize: 13 }}>Your generated weekly posts will appear here.</p>}
      </div>
    </section>

    <footer style={{ maxWidth: 1180, margin: "30px auto 0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#71869A", fontSize: 12 }}>
      <span>© {new Date().getFullYear()} Ekhaya Technologies</span>
      <span>AI Marketing is an optional add-on and does not change your Price Checker plan.</span>
    </footer>
  </main>;
}

const formLabel: React.CSSProperties = { display: "grid", gap: 7, color: "#40566B", fontSize: 12, fontWeight: 700 };
const field: React.CSSProperties = { boxSizing: "border-box", width: "100%", minHeight: 44, padding: "0 12px", border: "1px solid #DCE8F1", borderRadius: 7, fontSize: 13, background: "#fff", color: "#071B31" };
