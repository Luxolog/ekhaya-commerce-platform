export default function PartnerDashboardPage() {
  return (
    <main className="dashboard">
      <header><a href="/partners" className="brand"><span className="mark">E</span><span>EKHAYA <small>PARTNER PORTAL</small></span></a><a href="/partners">Programme overview ↗</a></header>
      <section className="intro"><p className="eyebrow">PARTNER WORKSPACE</p><h1>Your growth.<br/><em>Your rewards.</em></h1><p>Your referrals, subscriber activity, commission statements and payouts will live here.</p></section>
      <section className="locked">
        <div className="lock">✦</div><h2>Your partner account is not connected yet</h2>
        <p>This dashboard is ready for the partner data layer. Once applications, sign-in and subscription billing are connected, approved partners will see their own verified referral and commission records here.</p>
        <div className="steps"><span>01 · Apply and get approved</span><span>02 · Receive your unique referral link</span><span>03 · Track verified referrals and payouts</span></div>
        <a href="/partners" className="button">View the partner programme</a>
      </section>
      <footer>EKHAYA TECHNOLOGIES · PRIVATE PARTNER WORKSPACE</footer>
      <style jsx>{\`
        .dashboard{min-height:100vh;padding:0 6%;background:#f7f5f0;color:#20231f;font-family:Arial,Helvetica,sans-serif}header{height:76px;border-bottom:1px solid #e4e0d7;display:flex;align-items:center;justify-content:space-between}header>a:last-child{font-size:12px;color:#796640}.brand{display:flex;gap:10px;align-items:center;font-size:13px;font-weight:800;letter-spacing:2px}.brand small{display:block;font-size:8px;letter-spacing:3px;margin-top:3px;font-weight:500}.mark{width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#22271f;color:#dfc68e;font:24px Georgia}.intro{text-align:center;margin:65px auto 35px}.eyebrow{font-size:10px;letter-spacing:2px;color:#927b4b;font-weight:700}.intro h1{font:48px/1.05 Georgia;margin:16px 0}.intro h1 em{color:#947b49}.intro p:last-child{font-size:13px;color:#74756d}.locked{max-width:650px;margin:0 auto;background:#fff;border:1px solid #e6e2d9;border-radius:12px;padding:38px;text-align:center}.lock{width:48px;height:48px;border-radius:50%;background:#f1ecdf;color:#90794a;display:grid;place-items:center;margin:0 auto 18px;font-size:22px}.locked h2{font:25px Georgia;margin:0 0 12px}.locked p{font-size:13px;line-height:1.7;color:#707168}.steps{display:grid;gap:10px;margin:24px 0;color:#55584f;font-size:12px}.button{display:inline-block;background:#22271f;color:#f5e8c8;padding:13px 18px;border-radius:6px;font-size:12px;font-weight:700}footer{text-align:center;padding:35px;color:#99998f;font-size:9px;letter-spacing:1.5px}@media(max-width:600px){.locked{padding:25px}.intro h1{font-size:40px}}
      \`}</style>
    </main>
  );
}
