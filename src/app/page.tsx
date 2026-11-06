const pillars = [
  { number: '01', title: 'Independent stores', detail: 'Each merchant gets a distinct storefront, identity, catalog and customer experience.' },
  { number: '02', title: 'Tenant-first foundation', detail: 'Store ownership is designed into the data model from the beginning, not bolted on later.' },
  { number: '03', title: 'South African commerce', detail: 'The platform will be prepared for local payment and delivery integrations as later milestones.' },
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '32px clamp(20px, 6vw, 88px) 72px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, borderBottom: '1px solid var(--line)', paddingBottom: 22 }}>
        <div style={{ fontWeight: 700, letterSpacing: '.12em', fontSize: 13 }}>EKHAYA <span style={{ color: 'var(--gold)' }}>TECHNOLOGIES</span></div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>COMMERCE PLATFORM · FOUNDATION</span>
      </header>
      <section style={{ maxWidth: 900, padding: 'clamp(70px, 12vw, 145px) 0 80px' }}>
        <p style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '.18em', fontSize: 12 }}>BUILT FOR ORIGIN. READY FOR MANY.</p>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(42px, 7vw, 82px)', lineHeight: 1.06, fontWeight: 600, letterSpacing: '-.035em', margin: '20px 0 24px' }}>Commerce that gives every store its own home.</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.75, maxWidth: 670 }}>A custom multi-store platform for Ekhaya Scents and independent merchants—with each store’s identity, products and customers kept distinct.</p>
        <div style={{ display: 'inline-flex', marginTop: 32, padding: '12px 18px', border: '1px solid var(--gold)', borderRadius: 3, color: '#6d5429', fontSize: 12, fontWeight: 700, letterSpacing: '.08em' }}>PHASE 1 · FOUNDATION IN PROGRESS</div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, maxWidth: 1100 }}>
        {pillars.map((p) => <article key={p.number} style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 6, padding: 26 }}><div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700 }}>{p.number}</div><h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 23, margin: '18px 0 10px' }}>{p.title}</h2><p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{p.detail}</p></article>)}
      </section>
      <footer style={{ marginTop: 72, paddingTop: 20, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>Ekhaya Commerce Platform · Development environment · Not yet accepting orders</footer>
    </main>
  );
}
