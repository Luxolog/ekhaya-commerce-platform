import SiteHeader from '@/components/SiteHeader';

const pillars = [
  { number: '01', title: 'Compare marketplace prices', detail: 'Research product prices across supported South African marketplaces before you commit to stock.' },
  { number: '02', title: 'Understand your real margin', detail: 'Account for buying cost, marketplace fees and delivery before deciding what to sell.' },
  { number: '03', title: 'Make smarter sourcing decisions', detail: 'Use fresh, timestamped listing information and price history as the platform grows.' },
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '28px clamp(20px, 6vw, 88px) 72px', background: 'var(--pale)', color: 'var(--navy)' }}>
      <SiteHeader active="home" />
      <section style={{ maxWidth: 900, padding: 'clamp(65px, 11vw, 130px) 0 72px' }}>
        <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.18em', fontSize: 12 }}>BUILT FOR SOUTH AFRICAN RESELLERS</p>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(42px, 7vw, 82px)', lineHeight: 1.04, fontWeight: 800, letterSpacing: '-.055em', margin: '20px 0 24px', color: 'var(--navy)' }}>Know the market before you buy stock.</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.75, maxWidth: 670 }}>Compare marketplace prices, calculate your margins and make more informed sourcing decisions—all in one place. No marketplace seller account is required to start using the basic calculator.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
          <Link href="/price-checker/" style={{ display: 'inline-flex', padding: '15px 22px', background: 'var(--blue)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: '.04em', boxShadow: '0 8px 22px rgba(7,155,211,.2)' }}>OPEN PRICE CALCULATOR →</Link>
          <Link href="/marketplaces/" style={{ display: 'inline-flex', padding: '14px 18px', border: '1px solid var(--line)', background: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800, color: 'var(--navy)' }}>HOW MARKETPLACE CONNECTIONS WORK</Link>
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, maxWidth: 1100 }}>
        {pillars.map((p) => <article key={p.number} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 26, boxShadow: '0 10px 30px rgba(7,27,49,.04)' }}><div style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 800 }}>{p.number}</div><h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 21, fontWeight: 800, margin: '18px 0 10px' }}>{p.title}</h2><p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{p.detail}</p></article>)}
      </section>
      <footer style={{ marginTop: 72, paddingTop: 20, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>Ekhaya Price Checker · Android test build · Seller account connections are optional</footer>
    </main>
  );
}
