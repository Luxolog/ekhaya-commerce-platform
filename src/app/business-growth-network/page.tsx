"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const services = [
  { icon: "↗", title: "Business funding", detail: "Loans, stock finance and working capital." },
  { icon: "▣", title: "Logistics", detail: "Warehousing, fulfilment and delivery." },
  { icon: "＋", title: "Accounting", detail: "Bookkeeping, tax and financial services." },
  { icon: "▤", title: "Suppliers", detail: "Wholesalers, importers and distributors." },
  { icon: "◎", title: "Business development", detail: "Training, mentorship and business support." },
  { icon: "✳", title: "Marketing", detail: "Digital marketing and advertising services." },
];

const card = { background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 24, boxShadow: "0 8px 26px rgba(7,27,49,.035)" };
const muted = { color: "#60758A", fontSize: 14, lineHeight: 1.75 };

export default function BusinessGrowthNetworkPage() {
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  return (
    <main style={{ minHeight: "100vh", padding: "28px clamp(20px, 6vw, 88px) 72px", background: "#F4F8FC", color: "#071B31" }}>
      <SiteHeader active="business-growth-network" />
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(58px, 9vw, 100px) 0 42px" }}>
        <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: ".17em", marginTop: 28 }}>GROWING TOGETHER</p>
        <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(38px, 6vw, 68px)", lineHeight: 1.06, letterSpacing: "-.05em", margin: "14px 0 20px", maxWidth: 900 }}>Ekhaya Business Growth Network</h1>
        <p style={{ ...muted, fontSize: "clamp(16px, 2vw, 19px)", maxWidth: 820 }}>A growing ecosystem of services and opportunities for South African businesses.</p>
        <p style={{ ...muted, maxWidth: 850, marginTop: 18 }}>The Ekhaya Funding Partners Programme is an initiative designed to connect entrepreneurs, online sellers and SMEs with organisations that can support their business growth.</p>
      </section>

      <section style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: ".16em" }}>ONE NETWORK. MORE WAYS TO GROW.</p>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(27px, 4vw, 40px)", letterSpacing: "-.035em", margin: "9px 0 0" }}>Business support, connected.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 285px), 1fr))", gap: 16 }}>
          {services.map((service) => <button key={service.title} type="button" onClick={() => setComingSoon(service.title)} aria-label={`${service.title} - coming soon`} style={{ ...card, textAlign: "left", width: "100%", cursor: "pointer", font: "inherit", color: "inherit", transition: "transform .18s ease, box-shadow .18s ease" }}>
            <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 10, background: "#E4F5FB", color: "#0786B7", fontSize: 22, fontWeight: 700 }}>{service.icon}</div>
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, margin: "18px 0 7px" }}>{service.title}</h3>
            <p style={{ ...muted, margin: 0 }}>{service.detail}</p>
            {comingSoon === service.title && <p role="status" style={{ color: "#0786B7", fontSize: 12, fontWeight: 800, margin: "14px 0 0" }}>COMING SOON</p>}
          </button>)}
        </div>
      </section>

      <section style={{ maxWidth: 1080, margin: "54px auto 0", background: "#071B31", color: "#fff", borderRadius: 16, padding: "clamp(25px, 5vw, 42px)" }}>
        <p style={{ color: "#00A9E8", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>LAUNCHING SOON</p>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(25px, 4vw, 36px)", margin: "10px 0" }}>Helping South African businesses access the support they need to grow.</h2>
        <p style={{ color: "#D4E2EC", fontSize: 14, lineHeight: 1.8, maxWidth: 760 }}>We are building a network of organisations and service providers across funding, logistics, finance, supply, business development and marketing. Partner and programme details will be shared as the network develops.</p>
        <Link href="/" style={{ display: "inline-flex", marginTop: 14, padding: "12px 18px", background: "#079BD3", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>BACK TO EKHAYA TECHNOLOGIES →</Link>
      </section>
      <footer style={{ maxWidth: 1080, margin: "58px auto 0", paddingTop: 20, borderTop: "1px solid #DCE8F1", color: "#8195A8", fontSize: 12 }}>Ekhaya Technologies · Ekhaya Business Growth Network · South Africa</footer>
    </main>
  );
}
