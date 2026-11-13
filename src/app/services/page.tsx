import Image from 'next/image';
import Link from 'next/link';

const solutions = [
  { icon: '💻', title: 'Custom Business Applications', description: 'Purpose-built web and mobile applications designed around the way your business works.', status: 'Available', tone: '#079BD3' },
  { icon: '📊', title: 'Business Intelligence & Analytics', description: 'Turn business information into clearer reporting, useful insights and better decisions.', status: 'Enquire', tone: '#D6A500' },
  { icon: '🛒', title: 'E-commerce & Marketplaces', description: 'Online stores, marketplace platforms, product sourcing tools and connected commerce experiences.', status: 'Available', tone: '#A855F7' },
  { icon: '🎧', title: 'Ongoing Support & Maintenance', description: 'Practical technical support, improvements, updates and maintenance as your business grows.', status: 'Available', tone: '#EC4899' },
];

const marketplace = [
  { icon: '🏪', title: 'Open your online store', description: 'Create your own branded storefront on Ekhaya Marketplace.' },
  { icon: '📦', title: 'Sell your products', description: 'List products, manage stock and reach more customers.' },
  { icon: '📊', title: 'Vendor dashboard', description: 'Track orders, sales, payouts and store performance.' },
  { icon: '🚚', title: 'Orders & fulfilment', description: 'Manage customer orders, delivery and fulfilment in one place.' },
  { icon: '🤝', title: 'Find suppliers', description: 'Discover suppliers and products to grow your business.' },
  { icon: '💳', title: 'Payments & invoicing', description: 'Manage marketplace payments, commissions and invoices.' },
];

const card = { background: '#FFFFFF', border: '1px solid #DCE8F1', borderRadius: 18, padding: 26, boxShadow: '0 12px 32px rgba(7,27,49,.045)' };
const body = { color: '#60758A', fontSize: 14, lineHeight: 1.75, margin: '10px 0 0' };

export default function ServicesPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '24px clamp(20px, 6vw, 88px) 64px', color: '#071B31', background: '#F4F8FC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap', borderBottom: '1px solid #DCE8F1', paddingBottom: 18 }}>
        <Link href="/" aria-label="Ekhaya Technologies home"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies — Digital solutions. Built around you." width={230} height={190} priority style={{ width: 170, height: 'auto' }} /></Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 12, fontWeight: 800 }}>
          <Link href="/" style={{ color: '#60758A' }}>HOME</Link>
          <Link href="/services/" style={{ color: '#079BD3' }}>OUR SERVICES</Link>
          <Link href="/price-checker/" style={{ color: '#60758A' }}>PRICE CHECKER</Link>
        </nav>
      </header>

      <section style={{ maxWidth: 1050, margin: '66px auto 42px' }}>
        <p style={{ color: '#079BD3', fontSize: 12, letterSpacing: '.18em', fontWeight: 800, margin: 0 }}>EKHAYA TECHNOLOGIES · DIGITAL SOLUTIONS. BUILT AROUND YOU.</p>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(42px, 6.5vw, 76px)', lineHeight: 1.06, letterSpacing: '-.055em', margin: '18px 0', fontWeight: 800 }}>Custom digital solutions <span style={{ color: '#079BD3' }}>for growing businesses.</span></h1>
        <p style={{ color: '#60758A', fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.8, maxWidth: 780, margin: 0 }}>We build, connect and support digital tools that help businesses work smarter, serve customers and create new opportunities. Explore our services and see what is available now and what is coming next.</p>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto 72px' }}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ color: '#079BD3', fontSize: 11, letterSpacing: '.16em', fontWeight: 800, margin: 0 }}>WHAT WE DO</p>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(27px, 4vw, 38px)', margin: '8px 0', fontWeight: 800 }}>Technology that moves your business forward</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))', gap: 18 }}>
          {solutions.map((item) => <article key={item.title} style={{ ...card, borderTop: '4px solid ' + item.tone }}>
            <div style={{ fontSize: 34 }}>{item.icon}</div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 21, lineHeight: 1.25, margin: '18px 0 0', fontWeight: 800 }}>{item.title}</h3>
            <p style={body}>{item.description}</p>
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: item.status === 'Available' ? '#16A34A' : '#D6A500' }} />
              <span style={{ color: item.status === 'Available' ? '#15803D' : '#946C00', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>{item.status === 'Enquire' ? 'Enquire about this service' : item.status}</span>
            </div>
          </article>)}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', background: '#071B31', color: '#FFFFFF', borderRadius: 24, padding: 'clamp(26px, 5vw, 52px)' }}>
        <p style={{ color: '#00A9E8', fontSize: 11, letterSpacing: '.16em', fontWeight: 800, margin: 0 }}>IN DEVELOPMENT</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(32px, 5vw, 54px)', lineHeight: 1.08, margin: '12px 0 14px', letterSpacing: '-.04em' }}>Your business. Your store. More opportunities.</h2>
        <p style={{ color: '#C5D7E5', fontSize: 16, lineHeight: 1.75, maxWidth: 800, margin: 0 }}>We’re building Ekhaya Marketplace to help South African businesses sell online, manage their stores and grow. These capabilities are in development and will be released in stages.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14, marginTop: 30 }}>
          {marketplace.map((item) => <article key={item.title} style={{ background: '#102A43', border: '1px solid #29465F', borderRadius: 15, padding: 22 }}>
            <div style={{ fontSize: 29 }}>{item.icon}</div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, margin: '13px 0 0', fontWeight: 800 }}>{item.title}</h3>
            <p style={{ color: '#C5D7E5', fontSize: 13, lineHeight: 1.7, margin: '8px 0 15px' }}>{item.description}</p>
            <span style={{ display: 'inline-block', border: '1px solid #D6A500', color: '#FFE17A', borderRadius: 99, padding: '5px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '.08em' }}>COMING SOON</span>
          </article>)}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '60px auto 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 22 }}>
        <div><h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(25px, 4vw, 36px)', margin: 0 }}>Let’s build your next solution.</h2><p style={{ ...body, marginTop: 8 }}>Tell us what your business needs. We’ll help you find the right way forward.</p></div>
        <a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Technologies%20Service%20Enquiry" style={{ display: 'inline-flex', padding: '15px 22px', background: '#FFD43B', color: '#071B31', borderRadius: 10, fontSize: 13, fontWeight: 900 }}>MAKE AN ENQUIRY →</a>
      </section>
      <footer style={{ maxWidth: 1200, margin: '54px auto 0', paddingTop: 18, borderTop: '1px solid #DCE8F1', color: '#60758A', fontSize: 12 }}>© {new Date().getFullYear()} Ekhaya Technologies · Digital solutions. Built around you.</footer>
    </main>
  );
}
