import Link from "next/link";

const plans = [
  { name: "Starter", price: "R99", searches: "50 searches per month", description: "For sellers getting started" },
  { name: "Growth", price: "R149", searches: "100 searches per month", description: "For sellers building momentum" },
  { name: "Pro", price: "R199", searches: "150–250 searches per month", description: "For active sellers ready to scale" },
];

export default function PricingPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "32px 5% 70px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ maxWidth: 1120, margin: "0 auto 42px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <Link href="/" style={{ color: "#071B31", fontWeight: 800, textDecoration: "none" }}>EKHAYA TECHNOLOGIES</Link>
        <Link href="/account/" style={{ color: "#079BD3", fontWeight: 700, textDecoration: "none" }}>My account →</Link>
      </header>
      <section style={{ maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ color: "#079BD3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>EARLY ACCESS · SOUTH AFRICAN RESELLERS</p>
        <h1 style={{ fontSize: "clamp(34px, 5vw, 54px)", margin: "10px 0", letterSpacing: -1.5 }}>Know the market before you buy stock.</h1>
        <p style={{ color: "#60758A", lineHeight: 1.7, maxWidth: 720 }}>We&apos;re inviting a limited group of 10–20 sellers to test Ekhaya Price Checker at no cost through 30 November 2026. Paid subscriptions begin on 1 December 2026. No R49 introductory payment.</p>
        <div style={{ marginTop: 24, padding: "18px 20px", background: "#E7F5FC", border: "1px solid #B9E5F6", borderRadius: 12 }}>
          <strong style={{ color: "#067DAA" }}>EARLY TESTER ACCESS · FREE UNTIL 30 NOVEMBER 2026</strong>
          <p style={{ color: "#405A70", fontSize: 13, lineHeight: 1.65, margin: "7px 0 0" }}>Places are limited. Selected testers can explore the product and share feedback before paid plans start. Contact us to request an early-access place.</p>
          <a href="mailto:support@ekhayatech.co.za?subject=Price%20Checker%20Early%20Access" style={{ display: "inline-block", marginTop: 12, padding: "11px 16px", borderRadius: 8, background: "#079BD3", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 800 }}>REQUEST EARLY ACCESS</a>
        </div>
        <h2 style={{ fontSize: 24, margin: "42px 0 8px" }}>Simple monthly plans</h2>
        <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>Subscriptions start from 1 December 2026. No payment is collected during the free testing period.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          {plans.map((plan) => (
            <article key={plan.name} style={{ textAlign: "left", padding: 22, borderRadius: 12, border: "1px solid #DCE8F1", background: "#fff", color: "#071B31", boxShadow: "0 8px 24px #071b3108" }}>
              <h3 style={{ fontSize: 20, margin: 0 }}>{plan.name}</h3>
              <p style={{ color: "#60758A", fontSize: 12, margin: "7px 0" }}>{plan.description}</p>
              <strong style={{ display: "block", color: "#079BD3", fontSize: 30, marginTop: 18 }}>{plan.price}<small style={{ fontSize: 12, color: "#60758A", fontWeight: 500 }}>/month</small></strong>
              <p style={{ color: "#405A70", fontSize: 13, fontWeight: 700, marginTop: 14 }}>{plan.searches}</p>
            </article>
          ))}
        </div>
        <section style={{ marginTop: 18, background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div><h2 style={{ fontSize: 19, margin: "0 0 6px" }}>Need more than Pro?</h2><p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.6, margin: 0 }}>Talk to us about a tailored solution for your business and search requirements.</p></div>
          <a href="mailto:support@ekhayatech.co.za?subject=Custom%20Price%20Checker%20Solution" style={{ display: "inline-block", padding: "12px 18px", borderRadius: 8, background: "#071B31", color: "#fff", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>CONTACT US</a>
        </section>
        <p style={{ color: "#71869A", fontSize: 11, lineHeight: 1.6, marginTop: 24 }}>When paid subscriptions open, customers will be able to choose automatic monthly renewal (shown first) or manual monthly payments. Automatic payments will only be enabled with the customer&apos;s explicit consent.</p>
      </section>
    </main>
  );
}
