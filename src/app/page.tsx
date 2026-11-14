import SiteHeader from '@/components/SiteHeader';
import Link from 'next/link';

const current = [
  { tag: 'AVAILABLE NOW', title: 'Ekhaya Price Checker', detail: 'Research product prices and compare potential margins before buying stock. Takealot is the first live marketplace search integration, currently operating through a limited seller pilot.', href: '/price-checker/', action: 'EXPLORE PRICE CHECKER' },
  { tag: 'AVAILABLE AS A SERVICE', title: 'Digital solutions for businesses', detail: 'Ekhaya Technologies designs and develops custom business applications, online stores, business systems and practical integrations around real business needs.', href: '/services/', action: 'VIEW OUR SERVICES' },
];

const coming = [
  { number: '01', title: 'Ekhaya Marketplace', detail: 'A broader marketplace experience designed to bring buyers, independent sellers and products together in one place.' },
  { number: '02', title: 'Seller stores and product discovery', detail: 'Planned seller profiles and storefronts, with easier ways for customers to discover products from participating businesses.' },
  { number: '03', title: 'More marketplace connections', detail: 'Planned expansion beyond the first Takealot integration, subject to marketplace access, approvals and technical readiness.' },
  { number: '04', title: 'Smarter selling and sourcing tools', detail: 'A growing set of tools intended to help businesses research products, assess pricing and make better stock decisions.' },
];

const panel = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 26, boxShadow: '0 10px 30px rgba(7,27,49,.04)' };
const body = { color: 'var(--muted)', fontSize: 14, lineHeight: 1.8 };

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '28px clamp(20px, 6vw, 88px) 72px', background: 'var(--pale)', color: 'var(--navy)' }}>
      <SiteHeader active="home" />
      <section style={{ maxWidth: 1050, padding: 'clamp(65px, 10vw, 118px) 0 68px' }}>
        <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.18em', fontSize: 12 }}>EKHAYA TECHNOLOGIES · DIGITAL COMMERCE & BUSINESS TOOLS</p>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(42px, 7vw, 82px)', lineHeight: 1.04, fontWeight: 800, letterSpacing: '-.055em', margin: '20px 0 24px', color: 'var(--navy)' }}>Building better ways to do business.</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.8, maxWidth: 790 }}>Ekhaya Technologies is building a connected digital commerce ecosystem for businesses, sellers and shoppers. Explore what is available today, and see what we are working towards next.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
          <Link href="#available" style={{ display: 'inline-flex', padding: '15px 22px', background: 'var(--blue)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: '.04em', textDecoration: 'none' }}>EXPLORE WHAT'S AVAILABLE</Link>
          <Link href="#roadmap" style={{ display: 'inline-flex', padding: '14px 18px', border: '1px solid var(--line)', background: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800, color: 'var(--navy)', textDecoration: 'none' }}>SEE WHAT'S COMING</Link>
        </div>
      </section>

      <section id="available" style={{ maxWidth: 1150, scrollMarginTop: 28 }}>
        <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.17em', fontSize: 11 }}>START HERE</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(30px, 4.5vw, 48px)', letterSpacing: '-.04em', margin: '10px 0 24px' }}>Available today</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 18 }}>
          {current.map(item => <article key={item.title} style={panel}>
            <p style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 800, letterSpacing: '.14em', margin: 0 }}>{item.tag}</p>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 25, margin: '14px 0 10px' }}>{item.title}</h3>
            <p style={body}>{item.detail}</p>
            <Link href={item.href} style={{ display: 'inline-flex', marginTop: 12, color: 'var(--blue)', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>{item.action} →</Link>
          </article>)}
        </div>
        <p style={{ ...body, fontSize: 12, marginTop: 16 }}>Price Checker note: Takealot is the first live search integration. Access is currently limited to the seller pilot; other marketplace searches are not yet enabled.</p>
      </section>

      <section id="roadmap" style={{ maxWidth: 1150, marginTop: 76, scrollMarginTop: 28 }}>
        <p style={{ color: 'var(--blue)', fontWeight: 800, letterSpacing: '.17em', fontSize: 11 }}>THE BIGGER PICTURE</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(30px, 4.5vw, 48px)', letterSpacing: '-.04em', margin: '10px 0 12px' }}>Where we're going</h2>
        <p style={{ ...body, maxWidth: 780, fontSize: 16 }}>The Price Checker is one part of a much bigger plan. We are working towards an Ekhaya Marketplace that can support product discovery, independent sellers and smarter digital commerce.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 235px), 1fr))', gap: 18, marginTop: 26 }}>
          {coming.map(item => <article key={item.number} style={panel}>
            <div style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 800 }}>{item.number} · IN DEVELOPMENT / PLANNED</div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '17px 0 9px' }}>{item.title}</h3>
            <p style={{ ...body, margin: 0 }}>{item.detail}</p>
          </article>)}
        </div>
      </section>

      <section style={{ maxWidth: 1150, marginTop: 70, background: 'var(--navy)', color: '#fff', borderRadius: 18, padding: 'clamp(26px, 5vw, 46px)' }}>
        <p style={{ color: '#00A9E8', fontSize: 11, letterSpacing: '.16em', fontWeight: 800 }}>BUILT STEP BY STEP</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(27px, 4vw, 40px)', margin: '10px 0' }}>Be part of what we're building.</h2>
        <p style={{ color: '#D4E2EC', fontSize: 14, lineHeight: 1.8, maxWidth: 760 }}>Whether you are a seller, a business looking for digital tools, or a shopper interested in the marketplace as it develops, connect with Ekhaya Technologies.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          <Link href="/account/" style={{ display: 'inline-flex', padding: '13px 18px', background: '#079BD3', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>SELLER PILOT SIGN-UP →</Link>
          <Link href="/services/" style={{ display: 'inline-flex', padding: '12px 17px', border: '1px solid #60758A', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>OUR SERVICES</Link>
        </div>
      </section>
      <footer style={{ marginTop: 64, paddingTop: 20, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>Ekhaya Technologies · Building digital commerce and business tools, one step at a time.</footer>
    </main>
  );
}
