import SiteHeader from '@/components/SiteHeader';
import Link from 'next/link';

const steps = [
  'Sign in to your Takealot Seller Portal using your own browser.',
  'Find the API access or API key area in your seller settings. The exact menu label may change.',
  'Generate or copy your seller API key only when you are ready to connect.',
  'Keep the key private. Do not send it through email, WhatsApp, screenshots or ChatGPT.',
];

const panel = { background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 14, padding: 26, boxShadow: '0 10px 30px rgba(7,27,49,.04)' };
const body = { color: 'var(--muted)', fontSize: 14, lineHeight: 1.75 };
const note = { color: 'var(--blue)', fontSize: 11, lineHeight: 1.65, marginTop: 16, fontWeight: 600 };

export default function MarketplacesPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '28px clamp(20px, 6vw, 88px) 72px', color: 'var(--navy)', background: 'var(--pale)' }}>
      <SiteHeader active="marketplaces" />

      <section style={{ maxWidth: 850, margin: '68px auto 36px' }}>
        <p style={{ color: 'var(--blue)', fontSize: 11, letterSpacing: '.18em', fontWeight: 800 }}>OPTIONAL MARKETPLACE CONNECTIONS</p>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(38px, 6vw, 64px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-.045em', margin: '16px 0', color: 'var(--navy)' }}>Start where you are.<br /><span style={{ color: 'var(--blue)' }}>Connect when you're ready.</span></h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8, maxWidth: 650, fontSize: 16 }}>You do not need a Takealot or Amazon seller account to use the basic calculator. Enter product costs and selling prices manually today. Marketplace connections will add sales intelligence and faster product research as those integrations become available.</p>
        <Link href="/price-checker/" style={{ display: 'inline-flex', marginTop: 18, padding: '14px 20px', background: 'var(--blue)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>CONTINUE WITHOUT CONNECTING →</Link>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
        <article style={panel}>
          <div style={{ color: 'var(--blue)', fontSize: 11, letterSpacing: '.14em', fontWeight: 800 }}>MARKETPLACE 01</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 27, fontWeight: 800, margin: '12px 0', color: 'var(--navy)' }}>Takealot</h2>
          <p style={body}>Seller account connection is planned using Takealot's seller API. You will need to generate an API key inside your own Seller Portal.</p>
          <div style={{ background: 'var(--pale)', border: '1px solid var(--line)', borderRadius: 9, padding: 14, marginTop: 18 }}>
            <strong style={{ fontSize: 12 }}>Before connecting</strong>
            <ol style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.8, paddingLeft: 18, marginBottom: 0 }}>
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
          <p style={note}>Connection is not active in this test build. We will only request the key through a secure server-backed connection flow.</p>
        </article>

        <article style={panel}>
          <div style={{ color: 'var(--blue)', fontSize: 11, letterSpacing: '.14em', fontWeight: 800 }}>MARKETPLACE 02</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 27, fontWeight: 800, margin: '12px 0', color: 'var(--navy)' }}>Amazon</h2>
          <p style={body}>Amazon seller analytics will use Amazon's authorised seller connection process. You will approve access through Amazon rather than sharing your Seller Central password.</p>
          <div style={{ background: 'var(--pale)', border: '1px solid var(--line)', borderRadius: 9, padding: 14, marginTop: 18 }}>
            <strong style={{ fontSize: 12 }}>What you will need</strong>
            <ul style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.8, paddingLeft: 18, marginBottom: 0 }}>
              <li>An active Amazon Seller Central account for the supported marketplace.</li>
              <li>Permission to authorise a third-party application.</li>
              <li>To review and approve the requested access.</li>
            </ul>
          </div>
          <p style={note}>Amazon authorisation is not active in this test build. Never give Ekhaya your Seller Central password.</p>
        </article>
      </section>

      <section style={{ maxWidth: 1000, margin: '22px auto 0', background: 'var(--navy)', color: '#fff', borderRadius: 14, padding: '22px 26px' }}>
        <strong style={{ color: '#00A9E8' }}>No API key? No problem.</strong>
        <p style={{ color: '#D4E2EC', fontSize: 13, lineHeight: 1.7, margin: '8px 0 0' }}>Keep using Ekhaya's manual calculator. You can return to marketplace connections later. We will provide guided setup and a secure connection flow before asking you to submit any credentials.</p>
      </section>

      <footer style={{ maxWidth: 1000, margin: '42px auto 0', paddingTop: 18, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}>Ekhaya Technologies · Marketplace connections are optional and not yet enabled in this test build.</footer>
    </main>
  );
}
