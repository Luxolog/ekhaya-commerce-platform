"use client";

import { useMemo, useState } from "react";

const zar = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(value);

export default function PartnersPage() {
  const [subscribers, setSubscribers] = useState(50);
  const [rate, setRate] = useState(30);
  const monthly = useMemo(() => subscribers * 99 * rate / 100, [subscribers, rate]);

  return (
    <main className="partner-page">
      <nav className="nav">
        <a className="brand" href="/"><span className="mark">E</span><span>EKHAYA <small>TECHNOLOGIES</small></span></a>
        <a className="nav-link" href="/price-checker">Explore Price Checker ↗</a>
      </nav>
      <section className="hero">
        <p className="eyebrow">EKHAYA MARKETPLACE PRICE CHECKER</p>
        <h1>Grow with us.<br /><em>Earn as you refer.</em></h1>
        <p className="lead">Help South African marketplace sellers make smarter sourcing decisions. Introduce them to Ekhaya Marketplace Price Checker and earn commission when they become paying subscribers.</p>
        <div className="hero-actions"><a className="primary" href="#how-it-works">How the programme works</a><a className="secondary" href="/partners/dashboard">Partner dashboard</a></div>
        <p className="fine">Applications and live referral tracking will open once partner accounts and subscription billing are connected.</p>
      </section>
      <section className="benefits" id="how-it-works">
        <article><span>01</span><h2>Apply to partner</h2><p>Creators, sourcing specialists, marketplace educators and seller communities can apply. Ekhaya reviews each application before activation.</p></article>
        <article><span>02</span><h2>Share your link</h2><p>Approved partners receive a unique referral link and code to share in videos, posts, supplier visits and seller communities.</p></article>
        <article><span>03</span><h2>Earn monthly</h2><p>Earn commission on qualifying subscription payments from customers attributed to your link, for up to 12 months per referral.</p></article>
      </section>
      <section className="calculator">
        <div className="calc-copy"><p className="eyebrow">PARTNER EARNINGS ESTIMATOR</p><h2>What could your referrals earn?</h2><p>Estimate recurring commission using the standard R99 monthly subscription price. Actual earnings depend on paid, active referrals and your approved commission rate.</p></div>
        <div className="calc-panel">
          <label>Paying subscribers <strong>{subscribers}</strong></label>
          <input type="range" min="10" max="500" step="10" value={subscribers} onChange={(e) => setSubscribers(Number(e.target.value))} />
          <div className="range-labels"><span>10</span><span>500</span></div>
          <label>Commission rate</label>
          <div className="rates"><button className={rate===20?"selected":""} onClick={()=>setRate(20)}>Standard · 20%</button><button className={rate===30?"selected":""} onClick={()=>setRate(30)}>Founding · 30%</button></div>
          <div className="earning"><small>Estimated monthly commission</small><strong>{zar(monthly)}</strong><small>Based on {subscribers} active subscribers paying R99 each.</small></div>
          <p className="disclaimer">Illustration only, not a promise of income. Commission is calculated on qualifying subscription revenue actually received, excluding refunds, reversals and applicable VAT.</p>
        </div>
      </section>
      <section className="terms">
        <p className="eyebrow">CLEAR PARTNER TERMS</p><h2>Built to reward real growth.</h2>
        <div className="term-grid">
          <p><b>12-month earning window</b><br />Each referred customer has an individual 12-month commission period from their first qualifying payment.</p>
          <p><b>Monthly statements</b><br />Commissions are reconciled monthly and paid by EFT by the 7th working day of the following month, subject to the minimum payout threshold.</p>
          <p><b>R100 minimum payout</b><br />Balances below R100 roll forward to the next payment cycle.</p>
          <p><b>Approved referrals only</b><br />Self-referrals, duplicate accounts, fraud, failed payments and refunded transactions do not qualify.</p>
        </div>
        <div className="notice"><b>Important:</b> The programme is being prepared for launch. Rates, eligibility and payment terms are confirmed in each partner's agreement. The calculator is an estimate; no commission is payable until referral attribution, billing and payment reconciliation are live.</div>
      </section>
      <footer>EKHAYA TECHNOLOGIES · PARTNER PROGRAMME</footer>
      <style jsx>{`
        .partner-page{min-height:100vh;background:#f7f5f0;color:#20231f;padding:0 6%;font-family:Arial,Helvetica,sans-serif}
        .nav{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4e0d7}.brand{display:flex;gap:10px;align-items:center;font-size:13px;font-weight:800;letter-spacing:2px}.brand small{display:block;font-size:8px;letter-spacing:3px;margin-top:3px;font-weight:500}.mark{width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#22271f;color:#dfc68e;font:24px Georgia}.nav-link{font-size:12px;color:#76623b}
        .hero{max-width:850px;margin:82px auto 74px;text-align:center}.eyebrow{font-size:10px;letter-spacing:2px;color:#927b4b;font-weight:700}.hero h1{font:400 clamp(44px,7vw,76px)/1.04 Georgia;margin:18px 0}.hero h1 em{color:#947b49}.lead{max-width:650px;margin:0 auto;color:#686b62;font-size:16px;line-height:1.8}.hero-actions{display:flex;justify-content:center;gap:12px;margin-top:28px}.primary,.secondary{padding:13px 18px;border-radius:6px;font-size:12px;font-weight:700}.primary{background:#22271f;color:#f5e8c8}.secondary{border:1px solid #d8d1c3;color:#38382f}.fine{font-size:11px;color:#85867f;margin-top:18px}
        .benefits{max-width:1100px;margin:0 auto 80px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.benefits article{padding:24px;background:#fff;border:1px solid #e8e4db;border-radius:10px}.benefits article span{color:#9a8250;font-size:11px;font-weight:700}.benefits h2,.terms h2{font:24px Georgia;margin:15px 0 9px}.benefits p,.calc-copy p,.term-grid p{font-size:13px;line-height:1.7;color:#707168}
        .calculator{max-width:1100px;margin:0 auto 80px;background:#242920;color:#f7f3e9;border-radius:14px;padding:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.calc-copy h2{font:36px Georgia;margin:14px 0}.calc-copy p{color:#c7c7bd}.calc-panel{background:#fff;color:#252820;border-radius:10px;padding:24px}.calc-panel label{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin:8px 0 12px}.calc-panel input{width:100%;accent-color:#9a8250}.range-labels{display:flex;justify-content:space-between;color:#85867f;font-size:10px}.rates{display:flex;gap:8px}.rates button{flex:1;padding:11px 8px;border:1px solid #e1ddd3;border-radius:6px;background:#faf9f6;color:#4d4d43;font-size:11px;cursor:pointer}.rates button.selected{border-color:#9a8250;background:#f3eee2;color:#534326;font-weight:700}.earning{display:grid;gap:7px;margin-top:22px;padding:18px;background:#f5f3ed;border-radius:8px}.earning small{font-size:11px;color:#73746c}.earning strong{font:34px Georgia;color:#3e573f}.disclaimer{font-size:10px;line-height:1.6;color:#77796f}
        .terms{max-width:1100px;margin:0 auto 70px}.terms h2{font-size:34px;margin:12px 0 25px}.term-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 35px}.term-grid p{margin:0}.term-grid b{color:#30332c}.notice{margin-top:24px;padding:16px;border-left:3px solid #a88d55;background:#eeebe3;color:#62645c;font-size:12px;line-height:1.7}footer{text-align:center;padding:25px;color:#99998f;font-size:9px;letter-spacing:1.5px}
        @media(max-width:700px){.partner-page{padding:0 4%}.hero{margin:55px auto}.lead{font-size:14px}.benefits{grid-template-columns:1fr;margin-bottom:45px}.calculator{grid-template-columns:1fr;padding:22px;gap:20px;margin-bottom:50px}.calc-copy h2{font-size:30px}.term-grid{grid-template-columns:1fr}.terms h2{font-size:29px}.hero-actions{flex-wrap:wrap}}
      `}</style>
    </main>
  );
}
