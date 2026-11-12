'use client';

import { useState } from 'react';

const sellerFeatures = [
  { icon: '🏪', title: 'Open your online store', detail: 'Create your own branded storefront on Ekhaya Marketplace.' },
  { icon: '📦', title: 'Sell your products', detail: 'List products, manage stock and reach more customers.' },
  { icon: '📊', title: 'Vendor dashboard', detail: 'Track orders, sales, payouts and store performance.' },
  { icon: '🚚', title: 'Orders & fulfilment', detail: 'Manage customer orders, delivery and fulfilment in one place.' },
  { icon: '🤝', title: 'Find suppliers', detail: 'Discover suppliers and products to grow your business.' },
  { icon: '💳', title: 'Payments & invoicing', detail: 'Manage marketplace payments, commissions and invoices.' },
];

export default function MarketplaceComingSoon() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section style={{ maxWidth: 1100, marginTop: 76 }}>
      <div style={{ maxWidth: 760, marginBottom: 26 }}>
        <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.18em', fontSize: 12 }}>COMING TO EKHAYA</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 1.1, letterSpacing: '-.04em', margin: '12px 0' }}>Your business. Your store. More opportunities.</h2>
        <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.7 }}>We're building Ekhaya Marketplace to help South African businesses sell online, manage their stores and grow.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
        {sellerFeatures.map((feature) => (
          <button key={feature.title} type="button" onClick={() => setSelected(feature.title)} style={{ textAlign: 'left', cursor: 'pointer', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 22, color: 'var(--navy)', boxShadow: '0 8px 24px rgba(7,27,49,.035)' }}>
            <span style={{ fontSize: 25 }}>{feature.icon}</span>
            <span style={{ display: 'block', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, margin: '14px 0 8px' }}>{feature.title}</span>
            <span style={{ display: 'block', color: 'var(--muted)', fontSize: 13, lineHeight: 1.65 }}>{feature.detail}</span>
            <span style={{ display: 'block', color: 'var(--blue)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', marginTop: 17 }}>LEARN MORE →</span>
          </button>
        ))}
      </div>
      {selected && (
        <div role="dialog" aria-modal="true" aria-labelledby="coming-soon-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(5,20,38,.62)' }} onClick={() => setSelected(null)}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: '#fff', borderRadius: 18, padding: '34px 30px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.25)' }} onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close" onClick={() => setSelected(null)} style={{ position: 'absolute', right: 16, top: 14, border: 0, background: 'transparent', color: 'var(--muted)', fontSize: 25, cursor: 'pointer' }}>×</button>
            <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.16em', fontSize: 11 }}>EKHAYA MARKETPLACE</p>
            <h2 id="coming-soon-title" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 29, lineHeight: 1.15, margin: '12px 0' }}>{selected}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.7 }}>We're working on this feature. Ekhaya Marketplace is expected to launch in <strong style={{ color: 'var(--navy)' }}>mid-2027</strong>.</p>
            <div style={{ display: 'inline-block', marginTop: 10, padding: '11px 16px', borderRadius: 8, background: 'var(--pale)', color: 'var(--blue)', fontSize: 12, fontWeight: 800, letterSpacing: '.06em' }}>COMING SOON · MID-2027</div>
            <button type="button" onClick={() => setSelected(null)} style={{ display: 'block', width: '100%', marginTop: 24, padding: 13, border: 0, borderRadius: 8, background: 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>GOT IT</button>
          </div>
        </div>
      )}
    </section>
  );
}
