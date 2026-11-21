import Link from "next/link";
import Image from "next/image";

const sections = [
  { title: "1. Start with your business brief", body: "Describe what you sell, who buys it, where you operate and what you want to achieve. Include real product details and avoid sharing passwords, payment details or confidential customer information." },
  { title: "2. Choose the right tool", body: "Use the Content Studio for social posts and campaign ideas. Use Marketing Intelligence for competitor planning, positioning, customer personas, SWOT analysis and monthly strategy. Use the weekly planner to create seven editable post drafts." },
  { title: "3. Give the AI useful context", body: "Specific inputs produce more useful drafts. Include product benefits, target audience, price only when confirmed, preferred tone, platform and campaign objective. The AI must not invent product claims, discounts, testimonials or certifications." },
  { title: "4. Review before using content", body: "Check spelling, product details, availability, prices, claims, links and brand voice. Seller approval is an internal review status only. It does not publish or schedule content to Instagram, Facebook, TikTok or LinkedIn." },
  { title: "5. Understand your allowance", body: "Marketing Mini is proposed at R29 per month, with 10 AI posts, 4 campaign ideas, 5 research queries and 1 trend-planning report. Each generation consumes the relevant Marketing allowance. Marketing credits are separate from Price Checker searches." },
  { title: "6. Treat research responsibly", body: "Research and trend reports are AI-generated planning assistance based on the information you supply. They are not live web research, independently verified competitor facts, real-time prices or confirmed market trends. Validate important claims before making business decisions." },
];

const faqs = [
  ["Does AI Marketing publish directly to my social accounts?", "No. Social publishing and automatic scheduling are not connected. You can copy and export drafts for review and manual use."],
  ["Can it verify competitor prices?", "No. It can analyse competitor details you provide, but it does not independently verify live competitor pricing."],
  ["Are Marketing credits shared with Price Checker?", "No. Marketing subscriptions and usage are separate from Price Checker plans, search credits and payment records."],
  ["When can I pay for Marketing Mini?", "Checkout remains disabled until Paystack merchant approval and end-to-end payment testing are complete."],
  ["Can I edit saved reports and campaigns?", "Yes, where the relevant workspace is enabled. Always review saved content before using it externally."],
];

export default function MarketingGuidePage() {
  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "24px clamp(18px,5vw,72px) 64px", fontFamily: "Arial,sans-serif" }}>
    <header style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={150} style={{ width: 150, height: "auto" }} priority /></Link>
      <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}><Link href="/account/marketing/" style={{ color: "#079BD3" }}>AI Marketing</Link><Link href="/account/marketing/intelligence/" style={{ color: "#60758A" }}>Marketing Intelligence</Link><Link href="/account/" style={{ color: "#60758A" }}>My account</Link></nav>
    </header>
    <section style={{ maxWidth: 1000, margin: "44px auto 24px" }}>
      <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>SELLER HELP CENTRE</p>
      <h1 style={{ fontSize: "clamp(32px,5vw,48px)", letterSpacing: "-.04em", margin: "8px 0" }}>Getting started with AI Marketing</h1>
      <p style={{ color: "#60758A", lineHeight: 1.7, maxWidth: 740 }}>A practical guide to creating better content, planning campaigns and using AI-generated market analysis responsibly.</p>
    </section>
    <section style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: 12 }}>
      {sections.map(item => <article key={item.title} style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 12, padding: 20 }}><h2 style={{ fontSize: 17, margin: "0 0 8px" }}>{item.title}</h2><p style={{ color: "#526A7F", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{item.body}</p></article>)}
    </section>
    <section style={{ maxWidth: 1000, margin: "24px auto 0", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 12, padding: 22 }}>
      <h2 style={{ fontSize: 21, margin: "0 0 16px" }}>Frequently asked questions</h2>
      {faqs.map(([question, answer]) => <div key={question} style={{ padding: "13px 0", borderTop: "1px solid #EEF3F7" }}><h3 style={{ fontSize: 14, margin: "0 0 6px" }}>{question}</h3><p style={{ color: "#526A7F", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{answer}</p></div>)}
    </section>
    <p style={{ maxWidth: 1000, margin: "20px auto 0", color: "#71869A", fontSize: 11, lineHeight: 1.6 }}>AI Marketing is a planning and drafting assistant. Sellers remain responsible for verifying all commercial claims and for reviewing content before publication.</p>
  </main>;
}
