import Link from "next/link";

const partnerTypes = [
  {
    number: "01",
    title: "Creator & influencer partners",
    detail: "TikTok creators, YouTubers and social personalities who teach, review or discuss online selling, product sourcing and entrepreneurship.",
    value: "Introduce the Price Checker through honest demonstrations and useful seller education.",
  },
  {
    number: "02",
    title: "Marketplace educators & communities",
    detail: "Marketplace coaches, seller groups, training providers and communities supporting South African online sellers.",
    value: "Bring practical product-research tools into workshops, tutorials and seller resources.",
  },
  {
    number: "03",
    title: "Sourcing & supplier partners",
    detail: "Wholesalers, distributors, importers and product-sourcing businesses with relevant catalogues or supplier pricing.",
    value: "Help sellers move from marketplace opportunity research to credible sourcing options.",
  },
  {
    number: "04",
    title: "Technology & ecosystem partners",
    detail: "Seller software providers, service businesses and platforms that support marketplace merchants.",
    value: "Explore integrations and complementary services instead of duplicating what each partner already does well.",
  },
];

export const metadata = {
  title: "Partner with Ekhaya | Ekhaya Technologies",
  description: "Explore creator, educator, sourcing and technology partnerships with Ekhaya Marketplace Price Checker.",
};

export default function PartnersPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "30px clamp(20px, 6vw, 88px) 72px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", borderBottom: "1px solid var(--line)", paddingBottom: 20 }}>
        <Link href="/price-checker" style={{ fontWeight: 700, letterSpacing: ".12em", fontSize: 13 }}>EKHAYA <span style={{ color: "var(--gold)" }}>TECHNOLOGIES</span></Link>
        <Link href="/price-checker" style={{ color: "var(--muted)", fontSize: 13 }}>Back to Price Checker →</Link>
      </header>

      <section style={{ maxWidth: 900, padding: "clamp(64px, 10vw, 112px) 0 62px" }}>
        <p style={{ color: "var(--gold)", fontWeight: 700, letterSpacing: ".18em", fontSize: 12 }}>GROW THE SELLER ECOSYSTEM TOGETHER</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(42px, 7vw, 76px)", lineHeight: 1.06, fontWeight: 600, letterSpacing: "-.035em", margin: "18px 0 22px" }}>Good partnerships create better opportunities.</h1>
        <p style={{ color: "var(--muted)", fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.8, maxWidth: 740 }}>Ekhaya Marketplace Price Checker is being built to help South African marketplace sellers research products, compare marketplace selling prices and make more informed buying decisions. We want to grow it alongside the people and businesses already supporting that community.</p>
        <div style={{ display: "inline-flex", marginTop: 26, padding: "11px 15px", border: "1px solid var(--gold)", borderRadius: 3, color: "#6d5429", fontSize: 11, fontWeight: 700, letterSpacing: ".1em" }}>FOUNDING PARTNER CONVERSATIONS</div>
      </section>

      <section style={{ maxWidth: 1120 }}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ color: "var(--gold)", fontSize: 11, fontWeight: 700, letterSpacing: ".16em" }}>WHO WE WANT TO WORK WITH</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 42px)", margin: "10px 0" }}>Partnerships that make sense</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))", gap: 16 }}>
          {partnerTypes.map((item) => (
            <article key={item.number} style={{ background: "#fffdf9", border: "1px solid var(--line)", borderRadius: 6, padding: 25 }}>
              <span style={{ color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>{item.number}</span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, margin: "15px 0 10px" }}>{item.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>{item.detail}</p>
              <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 0 }}><strong>Potential collaboration:</strong> {item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, marginTop: 68, padding: "30px clamp(22px, 5vw, 48px)", background: "#211f1b", color: "#fffdf9", borderRadius: 6 }}>
        <p style={{ color: "#d0b47d", fontSize: 11, fontWeight: 700, letterSpacing: ".16em" }}>A PRACTICAL START</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", margin: "12px 0" }}>Start with a conversation. Build from shared value.</h2>
        <p style={{ color: "#d8d2c8", fontSize: 14, lineHeight: 1.8 }}>We are interested in product demonstrations, educational content, referral arrangements, supplier access and complementary technology integrations. Pilot arrangements—including any referral reward or commission—will be discussed and agreed with each partner before a campaign begins.</p>
        <p style={{ color: "#d8d2c8", fontSize: 13, lineHeight: 1.7, marginBottom: 0 }}>This is an invitation to explore a partnership, not an active affiliate registration or commission offer. Automated referral links, partner dashboards and commission payments will be introduced only when the account, billing and tracking systems are ready.</p>
      </section>

      <footer style={{ maxWidth: 1120, marginTop: 58, paddingTop: 20, borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 12 }}>Ekhaya Technologies · Ekhaya Marketplace Price Checker · Partnership programme preview</footer>
    </main>
  );
}
