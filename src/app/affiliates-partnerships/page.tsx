"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";

const partners = [
  { icon: "▣", title: "Logistics & warehousing", detail: "Warehousing, order fulfilment, courier and delivery providers supporting ecommerce sellers." },
  { icon: "＋", title: "Accounting & compliance", detail: "Bookkeeping, tax, accounting and business compliance service providers." },
  { icon: "▤", title: "Suppliers & sourcing", detail: "Wholesalers, importers, distributors and sourcing partners that help businesses access products." },
  { icon: "◎", title: "Business development", detail: "Training, mentorship and practical business support organisations." },
  { icon: "✳", title: "Marketing & growth", detail: "Digital marketing, advertising and customer-growth service providers." },
];

const card = { background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24, boxShadow: "0 8px 26px rgba(7,27,49,.035)" };
const muted = { color: "#60758A", fontSize: 14, lineHeight: 1.75 };

export default function AffiliatesPartnershipsPage() {
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  return (
    <main style={{ minHeight: "100vh", padding: "28px clamp(20px, 6vw, 88px) 72px", background: "#F4F8FC", color: "#071B31" }}>
      <SiteHeader active="affiliates-partnerships" />
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(58px, 9vw, 100px) 0 42px" }}>
        <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: ".17em" }}>GROWING TOGETHER</p>
        <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(38px, 6vw, 68px)", lineHeight: 1.06, letterSpacing: "-.05em", margin: "14px 0 20px", maxWidth: 900 }}>Ekhaya Affiliates & Partnerships</h1>
        <p style={{ ...muted, fontSize: "clamp(16px, 2vw, 19px)", maxWidth: 820 }}>Connecting entrepreneurs, online sellers and SMEs with trusted service providers that help them operate, comply and grow.</p>
        <p style={{ ...muted, maxWidth: 850, marginTop: 18 }}>This network brings together specialist businesses and organisations offering practical services to support South African businesses. Select a category to see its status as we build the network.</p>
      </section>
      <section style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: ".16em" }}>OUR PARTNER CATEGORIES</p>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(27px, 4vw, 40px)", letterSpacing: "-.035em", margin: "9px 0 0" }}>The right support, through the right partners.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 285px), 1fr))", gap: 16 }}>
          {partners.map((partner) => <button key={partner.title} type="button" onClick={() => setComingSoon(partner.title)} aria-label={partner.title + " - coming soon"} style={{ ...card, textAlign: "left", width: "100%", cursor: "pointer", font: "inherit", color: "inherit" }}>
            <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 10, background: "#E4F5FB", color: "#0786B7", fontSize: 22, fontWeight: 700 }}>{partner.icon}</div>
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, margin: "18px 0 7px" }}>{partner.title}</h3>
            <p style={{ ...muted, margin: 0 }}>{partner.detail}</p>
            {comingSoon === partner.title && <p role="status" style={{ color: "#0786B7", fontSize: 12, fontWeight: 800, margin: "14px 0 0" }}>COMING SOON</p>}
          </button>)}
        </div>
      </section>
      <section style={{ maxWidth: 1080, margin: "54px auto 0", background: "#071B31", color: "#fff", borderRadius: 16, padding: "clamp(25px, 5vw, 42px)" }}>
        <p style={{ color: "#00A9E8", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>BECOME A PARTNER</p>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(25px, 4vw, 36px)", margin: "10px 0" }}>Work with Ekhaya to support growing businesses.</h2>
        <p style={{ color: "#D4E2EC", fontSize: 14, lineHeight: 1.8, maxWidth: 760 }}>We welcome enquiries from established service providers interested in reaching entrepreneurs, online sellers and SMEs through the Ekhaya network.</p>
        <a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Affiliate%20and%20Partnership%20Enquiry" style={{ display: "inline-flex", marginTop: 14, padding: "12px 18px", background: "#079BD3", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>ENQUIRE ABOUT PARTNERING →</a>
      </section>
      <footer style={{ maxWidth: 1080, margin: "58px auto 0", paddingTop: 20, borderTop: "1px solid #DCE8F1", color: "#8195A8", fontSize: 12 }}>Ekhaya Technologies · Affiliates & Partnerships · South Africa</footer>
    </main>
  );
}
