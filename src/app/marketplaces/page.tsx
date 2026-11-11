import Link from 'next/link';

const steps = [
  'Sign in to your Takealot Seller Portal using your own browser.',
  'Find the API access or API key area in your seller settings. The exact menu label may change.',
  'Generate or copy your seller API key only when you are ready to connect.',
  'Keep the key private. Do not send it through email, WhatsApp, screenshots or ChatGPT.',
];

export default function MarketplacesPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '28px clamp(20px, 6vw, 88px) 72px', color: '#20231f' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderBottom: '1px solid #e5e0d6', paddingBottom: 20 }}>
        <Link href="/" style={{ fontWeight: 700, letterSpacing: '.12em', fontSize: 13 }}>EKHAYA <span style={{ color: '#b89a62' }}>TECHNOLOGIES</span></Link>
        <Link href="/price-checker/" style={{ color: '#75613b', fontSize: 13, fontWeight: 700 }}>Open calculator →</Link>
      </header>

      <section style={{ maxWidth: 850, margin: '68px auto 36px' }}>
        <p style={{ color: '#9b8552', fontSize: 11, letterSpacing: '.18em', fontWeight: 700 }}>OPTIONAL MARKETPLACE CONNECTIONS</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(38px, 6vw, 64px)', lineHeight: 1.08, fontWeight: 400, margin: '16px 0' }}>Start where you are.<br /><em style={{ color: '#8b794e' }}>Connect when you're ready.</em></h1>
        <p style={{ color: '#70736b', lineHeight: 1.8, maxWidth: 650, fontSize: 16 }}>You do not need a Takealot or Amazon seller account to use the basic calculator. Enter product costs and selling prices manually today. Marketplace connections will add sales intelligence and faster product research as those integrations become available.</p>
        <Link href="/price-checker/" style={{ display: 'inline-flex', marginTop: 18, padding: '13px 19px', background: '#22271f', color: '#d8bd7c', borderRadius: 5, fontSize: 12, fontWeight: 700 }}>CONTINUE WITHOUT CONNECTING →</Link>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
        <article style={{ background: '#fff', border: '1px solid #e7e5df', borderRadius: 12, padding: 26 }}>
          <div style={{ color: '#8b794e', fontSize: 11, letterSpacing: '.14em', fontWeight: 700 }}>MARKETPLACE 01</div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 29, fontWeight: 400, margin: '12px 0' }}>Takealot</h2>
          <p style={{ color: '#70736b', fontSize: 14, lineHeight: 1.7 }}>Seller account connection is planned using Takealot's seller API. You will need to generate an API key inside your own Seller Portal.</p>
          <div style={{ background: '#f7f5ef', borderRadius: 8, padding: 14, marginTop: 18 }}>
            <strong style={{ fontSize: 12 }}>Before connecting</strong>
            <ol style={{ color: '#686b62', fontSize: 12, lineHeight: 1.8, paddingLeft: 18, marginBottom: 0 }}>
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
          <p style={{ color: '#8b794e', fontSize: 11, lineHeight: 1.6, marginTop: 16 }}>Connection is not active in this test build. We will only request the key through a secure server-backed connection flow.</p>
        </article>

        <article style={{ background: '#fff', border: '1px solid #e7e5df', borderRadius: 12, padding: 26 }}>
          <div style={{ color: '#8b794e', fontSize: 11, letterSpacing: '.14em', fontWeight: 700 }}>MARKETPLACE 02</div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 29, fontWeight: 400, margin: '12px 0' }}>Amazon</h2>
          <p style={{ color: '#70736b', fontSize: 14, lineHeight: 1.7 }}>Amazon seller analytics will use Amazon's authorised seller connection process. You will approve access through Amazon rather than sharing your Seller Central password.</p>
          <div style={{ background: '#f7f5ef', borderRadius: 8, padding: 14, marginTop: 18 }}>
            <strong style={{ fontSize: 12 }}>What you will need</strong>
            <ul style={{ color: '#686b62', fontSize: 12, lineHeight: 1.8, paddingLeft: 18, marginBottom: 0 }}>
              <li>An active Amazon Seller Central account for the supported marketplace.</li>
              <li>Permission to authorise a third-party application.</li>
              <li>To review and approve the requested access.</li>
            </ul>
          </div>
          <p style={{ color: '#8b794e', fontSize: 11, lineHeight: 1.6, marginTop: 16 }}>Amazon authorisation is not active in this test build. Never give Ekhaya your Seller Central password.</p>
        </article>
      </section>

      <section style={{ maxWidth: 1000, margin: '22px auto 0', background: '#22271f', color: '#fff', borderRadius: 12, padding: '22px 26px' }}>
        <strong style={{ color: '#d8bd7c' }}>No API key? No problem.</strong>
        <p style={{ color: '#d1d2ca', fontSize: 13, lineHeight: 1.7, margin: '8px 0 0' }}>Keep using Ekhaya's manual calculator. You can return to marketplace connections later. We will provide guided setup and a secure connection flow before asking you to submit any credentials.</p>
      </section>

      <footer style={{ maxWidth: 1000, margin: '42px auto 0', paddingTop: 18, borderTop: '1px solid #e5e0d6', color: '#92938b', fontSize: 11 }}>Ekhaya Technologies · Marketplace connections are optional and not yet enabled in this test build.</footer>
    </main>
  );
}
