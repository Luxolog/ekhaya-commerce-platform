import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ReferralAttribution from "./ReferralAttribution";

export const metadata: Metadata = {
  title: "SA eChamber | Ekhaya Technologies",
  description: "Discover Ekhaya Technologies digital tools for South African online sellers and growing businesses, through the SA eChamber partnership.",
  openGraph: {
    title: "SA eChamber × Ekhaya Technologies",
    description: "Explore marketplace research and business tools from Ekhaya Technologies.",
    url: "https://ekhayatech.co.za/partners/saechamber/",
    siteName: "Ekhaya Technologies",
    type: "website",
  },
};

const registerUrl = "/account/?ref=SAECHAMBER";
const card = { background: "#fff", border: "1px solid #DCE8F1", borderRadius: 18, padding: 26, boxShadow: "0 12px 34px rgba(7,27,49,.045)" };
const muted = { color: "#60758A", fontSize: 14, lineHeight: 1.8 };

export default function SaeChamberShowcasePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "24px clamp(18px,5vw,72px) 68px" }}>
      <ReferralAttribution />
      <SiteHeader />
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(56px,8vw,92px) 0 48px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, background: "#E5F6FC", color: "#087EAC", fontSize: 11, fontWeight: 800, letterSpacing: ".09em" }}>
          <span>SA eCHAMBER PARTNER SHOWCASE</span><span aria-hidden="true">·</span><span>EKHAYA TECHNOLOGIES</span>
        </div>
        <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(40px,6.8vw,76px)", lineHeight: 1.04, letterSpacing: "-.055em", maxWidth: 940, margin: "22px 0 18px" }}>
          Practical digital tools to help your business <span style={{ color: "#079BD3" }}>move forward.</span>
        </h1>
        <p style={{ ...muted, fontSize: "clamp(16px,2vw,19px)", maxWidth: 790 }}>
          Through our partnership with SA eChamber, Ekhaya Technologies is introducing digital products and business systems designed to help South African entrepreneurs, online sellers and growing businesses work smarter.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
          <Link href={registerUrl} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "14px 21px", background: "#079BD3", color: "#fff", borderRadius: 9, textDecoration: "none", fontWeight: 800, fontSize: 13 }}>CREATE YOUR FREE ACCOUNT →</Link>
          <Link href="#products" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "14px 21px", background: "#fff", color: "#071B31", border: "1px solid #DCE8F1", borderRadius: 9, textDecoration: "none", fontWeight: 800, fontSize: 13 }}>EXPLORE THE PRODUCTS</Link>
        </div>
        <p style={{ ...muted, fontSize: 12, marginTop: 16 }}>Start with Ekhaya Price Checker’s 5 welcome searches. No payment details are required to create an account.</p>
      </section>

      <section id="products" style={{ maxWidth: 1120, margin: "0 auto", scrollMarginTop: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: ".16em" }}>THE EKHAYA TECHNOLOGIES PRODUCT ECOSYSTEM</p>
          <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(30px,4.5vw,46px)", letterSpacing: "-.04em", margin: "10px 0" }}>Tools for selling, serving and growing.</h2>
          <p style={{ ...muted, maxWidth: 760 }}>Explore the product currently available and the business systems we are developing for the next stage of the Ekhaya ecosystem.</p>
        </div>
        <article style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 28, alignItems: "center", borderColor: "#B9DDED" }}>
          <div>
            <span style={{ display: "inline-block", background: "#E5F6FC", color: "#087EAC", padding: "7px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: ".08em" }}>AVAILABLE NOW · SELLER TOOL</span>
            <h3 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(28px,4vw,38px)", letterSpacing: "-.035em", margin: "16px 0 10px" }}>Ekhaya Marketplace Price Checker</h3>
            <p style={muted}>Research products before you list. Compare marketplace offers, estimate selling fees and assess potential margins using one seller-focused workspace.</p>
            <ul style={{ ...muted, paddingLeft: 19 }}>
              <li>Search by product name, barcode or product photo</li>
              <li>Compare marketplace product listings, with Takealot as the first live marketplace</li>
              <li>Estimate marketplace fees and calculate potential profit and margin</li>
              <li>Start with 5 welcome searches on a new account</li>
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
              <Link href="/price-checker/" style={{ color: "#087EAC", fontWeight: 800, fontSize: 12, textDecoration: "none", padding: "12px 0" }}>EXPLORE PRICE CHECKER →</Link>
              <Link href={registerUrl} style={{ color: "#087EAC", fontWeight: 800, fontSize: 12, textDecoration: "none", padding: "12px 0" }}>CREATE AN ACCOUNT →</Link>
            </div>
          </div>
          <div style={{ background: "#071B31", color: "#fff", borderRadius: 14, padding: "clamp(22px,4vw,34px)" }}>
            <p style={{ color: "#62D3F7", fontSize: 10, fontWeight: 800, letterSpacing: ".16em", margin: 0 }}>SELL WITH BETTER INFORMATION</p>
            <div style={{ fontFamily: "Manrope,sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1.15, marginTop: 18 }}>Research. Compare. Calculate.</div>
            <p style={{ color: "#C5D7E5", fontSize: 13, lineHeight: 1.8, marginBottom: 0 }}>Make more informed sourcing and pricing decisions before committing to stock or listing a product.</p>
          </div>
        </article>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 18, marginTop: 18 }}>
          <article style={card}>
            <span style={{ display: "inline-block", background: "#F1F4F7", color: "#60758A", padding: "7px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: ".08em" }}>IN DEVELOPMENT</span>
            <div style={{ fontSize: 30, marginTop: 18 }} aria-hidden="true">🎧</div>
            <h3 style={{ fontFamily: "Manrope,sans-serif", fontSize: 24, margin: "12px 0 8px" }}>Ekhaya Support Desk</h3>
            <p style={muted}>A business support workspace being developed to help organisations manage customer enquiries, organise support requests and follow issues through to resolution.</p>
            <p style={{ color: "#60758A", fontSize: 11, fontWeight: 700, marginTop: 18 }}>DEMO AND AVAILABILITY BY ENQUIRY</p>
          </article>
          <article style={card}>
            <span style={{ display: "inline-block", background: "#F1F4F7", color: "#60758A", padding: "7px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: ".08em" }}>IN DEVELOPMENT</span>
            <div style={{ fontSize: 30, marginTop: 18 }} aria-hidden="true">🧾</div>
            <h3 style={{ fontFamily: "Manrope,sans-serif", fontSize: 24, margin: "12px 0 8px" }}>Ekhaya Invoicing</h3>
            <p style={muted}>A business invoicing system being developed to help businesses prepare professional invoices, keep billing records organised and manage payment workflows.</p>
            <p style={{ color: "#60758A", fontSize: 11, fontWeight: 700, marginTop: 18 }}>DEMO AND AVAILABILITY BY ENQUIRY</p>
          </article>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "54px auto 0", background: "#071B31", color: "#fff", borderRadius: 18, padding: "clamp(26px,5vw,44px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 24, alignItems: "center" }}>
        <div>
          <p style={{ color: "#62D3F7", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>YOUR NEXT STEP</p>
          <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.12, margin: "10px 0" }}>Discover what Ekhaya can do for your business.</h2>
          <p style={{ color: "#C5D7E5", fontSize: 14, lineHeight: 1.8, maxWidth: 650 }}>Create your account to get started with Price Checker, or contact our team to discuss the business systems and services that fit your needs.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
          <Link href={registerUrl} style={{ textAlign: "center", padding: "14px 18px", borderRadius: 9, background: "#079BD3", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13 }}>GET STARTED FREE →</Link>
          <a href="mailto:support@ekhayatech.co.za?subject=SA%20eChamber%20%E2%80%93%20Ekhaya%20Technologies%20Enquiry" style={{ textAlign: "center", padding: "14px 18px", borderRadius: 9, border: "1px solid #547087", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13 }}>CONTACT EKHAYA TECHNOLOGIES</a>
        </div>
      </section>
      <div style={{ maxWidth: 1120, margin: "22px auto 0", padding: 16, borderRadius: 12, background: "#EAF5FA", color: "#40566B", fontSize: 12, lineHeight: 1.7 }}>
        This showcase is provided through the SA eChamber partnership. Product availability and features may vary by release stage. The Support Desk and Invoicing products are in development and are not yet presented as generally available services.
      </div>
      <SiteFooter />
    </main>
  );
}
