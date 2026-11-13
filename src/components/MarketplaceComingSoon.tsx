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
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const featureKeys: Record<string, string> = { 'Open your online store': 'storefront', 'Sell your products': 'product_selling', 'Vendor dashboard': 'vendor_dashboard', 'Orders & fulfilment': 'fulfilment', 'Find suppliers': 'suppliers', 'Payments & invoicing': 'payments' };
  async function joinWaitlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');
    try {
      const response = await fetch('/api/marketplace-waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, featureKey: selected ? featureKeys[selected] : '', consent, website: (event.currentTarget.elements.namedItem('website') as HTMLInputElement)?.value || '' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      setStatus(result.message || 'You are on the list!');
      setEmail('');
      setConsent(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ maxWidth: 1100, marginTop: 76 }}>
      <div style={{ maxWidth: 760, marginBottom: 26 }}>
        <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.18em', fontSize: 12 }}>COMING TO EKHAYA</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 1.1, letterSpacing: '-.04em', margin: '12px 0' }}>Your business. Your store. More opportunities.</h2>
        <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.7 }}>We&apos;re building Ekhaya Marketplace to help South African businesses sell online, manage their stores and grow.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
        {sellerFeatures.map((feature) => (
          <button key={feature.title} type="button" onClick={() => { setSelected(feature.title); setStatus(''); setEmail(''); setConsent(false); }} style={{ textAlign: 'left', cursor: 'pointer', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 22, color: 'var(--navy)', boxShadow: '0 8px 24px rgba(7,27,49,.035)' }}>
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
            <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.7 }}>We&apos;re working on this feature. Ekhaya Marketplace is expected to launch in <strong style={{ color: 'var(--navy)' }}>mid-2027</strong>.</p>
            <form onSubmit={joinWaitlist} style={{ marginTop: 22, textAlign: 'left' }}>
              <label htmlFor="marketplace-waitlist-email" style={{ display: 'block', color: 'var(--navy)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Get notified when this is ready</label>
              <input id="marketplace-waitlist-email" type="email" required maxLength={254} autoComplete="email" placeholder="Enter your email address" value={email} onChange={(event) => setEmail(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, color: 'var(--navy)' }} />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required style={{ marginTop: 2 }} /><span>I agree that Ekhaya Technologies may store my email and contact me with updates about this feature and the marketplace launch.</span></label>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-10000px', opacity: 0 }} />
              {status && <p role="status" style={{ color: status.startsWith('You are') ? '#087A50' : '#B42318', fontSize: 12, lineHeight: 1.5, margin: '12px 0 0' }}>{status}</p>}
              <button type="submit" disabled={submitting} style={{ display: 'block', width: '100%', marginTop: 14, padding: 13, border: 0, borderRadius: 8, background: 'var(--blue)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? .7 : 1 }}>{submitting ? 'ADDING YOU…' : 'NOTIFY ME WHEN READY'}</button>
            </form>
            <div style={{ display: 'inline-block', marginTop: 10, padding: '11px 16px', borderRadius: 8, background: 'var(--pale)', color: 'var(--blue)', fontSize: 12, fontWeight: 800, letterSpacing: '.06em' }}>COMING SOON · MID-2027</div>
            
          </div>
        </div>
      )}
    </section>
  );
}
