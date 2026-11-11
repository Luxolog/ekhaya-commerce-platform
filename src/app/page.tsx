const pillars = [
  { number: '01', title: 'Compare marketplace prices', detail: 'Research product prices across supported South African marketplaces before you commit to stock.' },
  { number: '02', title: 'Understand your real margin', detail: 'Account for buying cost, marketplace fees and delivery before deciding what to sell.' },
  { number: '03', title: 'Make smarter sourcing decisions', detail: 'Use fresh, timestamped listing information and price history as the platform grows.' },
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '32px clamp(20px, 6vw, 88px) 72px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, borderBottom: '1px solid var(--line)', paddingBottom: 22 }}>
        <div style={{ fontWeight: 700, letterSpacing: '.12em', fontSize: 13 }}>EKHAYA <span style={{ color: 'var(--gold)' }}>TECHNOLOGIES</span></div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>PRICE INTELLIGENCE</span>
      </header>
      <section style={{ maxWidth: 900, padding: 'clamp(70px, 12vw, 145px) 0 80px' }}>
        <p style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '.18em', fontSize: 12 }}>BUILT FOR SOUTH AFRICAN RESELLERS</p>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(42px, 7vw, 82px)', lineHeight: 1.06, fontWeight: 600, letterSpacing: '-.035em', margin: '20px 0 24px' }}>Know the market before you buy stock.</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.75, maxWidth: 670 }}>Compare marketplace prices, calculate your margins and make more informed sourcing decisions—all in one place.</p>
        <a href="/price-checker/" style={{ display: 'inline-flex', marginTop: 32, padding: '14px 22px', background: '#22271f', color: '#d8bd7c', borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: '.06em' }}>OPEN PRICE CALCULATOR →</a>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, maxWidth: 1100 }}>
        {pillars.map((p) => <article key={p.number} style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 6, padding: 26 }}><div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700 }}>{p.number}</div><h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 23, margin: '18px 0 10px' }}>{p.title}</h2><p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{p.detail}</p></article>)}
      </section>
      <footer style={{ marginTop: 72, paddingTop: 20, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>Ekhaya Price Checker · Android test build · Live marketplace integration is being prepared</footer>
    </main>
  );
}
