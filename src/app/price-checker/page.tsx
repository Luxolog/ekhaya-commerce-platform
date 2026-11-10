"use client";

import { useMemo, useState } from "react";
import { calculatePrice } from "@/lib/price-calculator";

const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);

export default function PriceCheckerPage() {
  const [cost, setCost] = useState("55");
  const [sellingPrice, setSellingPrice] = useState("99");
  const [feePercent, setFeePercent] = useState("15");
  const [fixedFee, setFixedFee] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [targetMargin, setTargetMargin] = useState("25");

  const result = useMemo(() => calculatePrice({
    buyingCost: Number(cost) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    marketplaceFeePercent: Number(feePercent) || 0,
    fixedFee: Number(fixedFee) || 0,
    otherCosts: Number(shipping) || 0,
    targetMarginPercent: Number(targetMargin) || 0,
  }), [cost, sellingPrice, feePercent, fixedFee, shipping, targetMargin]);

  return (
    <main className="price-page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ekhaya Technologies home">
          <span className="brand-mark">E</span>
          <span>EKHAYA <small>TECHNOLOGIES</small></span>
        </a>
        <span className="phase-pill">PRICE INTELLIGENCE · PHASE 1</span>
      </header>

      <section className="hero">
        <p className="eyebrow">SELL SMARTER. PRICE WITH CONFIDENCE.</p>
        <h1>Know your numbers<br /><em>before you buy.</em></h1>
        <p className="hero-copy">
          Check your potential profit, account for marketplace costs, and find a
          selling price that works for your business.
        </p>
      </section>

      <section className="workspace" aria-label="Price checker calculator">
        <div className="panel inputs-panel">
          <div className="panel-heading">
            <div>
              <span className="step">01 / YOUR PRODUCT</span>
              <h2>Price calculator</h2>
            </div>
            <span className="live-dot">● LIVE</span>
          </div>

          <label>
            Your buying cost <span>(R)</span>
            <input inputMode="decimal" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          <label>
            Planned selling price <span>(R)</span>
            <input inputMode="decimal" type="number" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
          </label>

          <div className="field-row">
            <label>
              Marketplace fee <span>(%)</span>
              <input inputMode="decimal" type="number" min="0" max="100" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} />
            </label>
            <label>
              Fixed fee <span>(R)</span>
              <input inputMode="decimal" type="number" min="0" value={fixedFee} onChange={(e) => setFixedFee(e.target.value)} />
            </label>
          </div>

          <label>
            Other costs / shipping contribution <span>(R)</span>
            <input inputMode="decimal" type="number" min="0" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </label>

          <div className="target-box">
            <label>
              Target profit margin <strong>{targetMargin}%</strong>
            </label>
            <input className="range" type="range" min="5" max="70" step="1" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} />
            <div className="range-labels"><span>5% margin</span><span>70% margin</span></div>
          </div>
          <p className="fine-print">Fees are estimates you enter. Actual marketplace fees and fulfilment costs may differ.</p>
        </div>

        <div className="panel results-panel">
          <div className="panel-heading">
            <div>
              <span className="step">02 / YOUR RESULT</span>
              <h2>Profit snapshot</h2>
            </div>
            <span className="sparkle">✳</span>
          </div>

          <div className="profit-card">
            <span>Estimated profit per sale</span>
            <strong className={result.profit >= 0 ? "positive" : "negative"}>{money(result.netProfit)}</strong>
            <span className="profit-foot">After entered costs and marketplace fees</span>
          </div>

          <div className="metrics">
            <div><span>Profit margin</span><strong>{result.marginPercent.toFixed(1)}%</strong></div>
            <div><span>Marketplace fees</span><strong>{money(result.marketplaceFee)}</strong></div>
          </div>

          <div className="recommendation">
            <div className="recommendation-icon">↗</div>
            <div>
              <span className="step">SUGGESTED SELLING PRICE</span>
              <strong>{result.suggestedPrice !== null ? money(result.suggestedPrice) : "Not achievable with these fee assumptions"}</strong>
              <p>Estimated price to reach your selected margin.</p>
            </div>
          </div>

          <div className="launch-note">
            <span className="note-icon">✦</span>
            <div><strong>Price research is coming next</strong><p>Phase 1 starts with a transparent calculator. Public listing research and AI exact/similar product matching will be added in later releases.</p></div>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <span>THE SCENT OF ORIGIN · BUILT FOR SOUTH AFRICAN SELLERS</span>
        <span>EKHAYA TECHNOLOGIES © 2026</span>
      </footer>

      <style jsx>{`
        .price-page { min-height: 100vh; background: #f5f4f0; color: #20231f; padding: 0 5.5%; font-family: Arial, Helvetica, sans-serif; }
        .topbar { height: 82px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e2e1dc; }
        .brand { display:flex; gap:11px; align-items:center; color:#20231f; text-decoration:none; font-size:13px; font-weight:800; letter-spacing:2px; }
        .brand small { display:block; margin-top:3px; font-size:8px; letter-spacing:3.1px; font-weight:500; }
        .brand-mark { width:34px; height:34px; display:grid; place-items:center; background:#22271f; color:#d8bd7c; font-family:Georgia,serif; font-size:23px; border-radius:50%; }
        .phase-pill { border:1px solid #d8d6cf; border-radius:30px; padding:9px 13px; color:#686b62; font-size:9px; letter-spacing:1.5px; }
        .hero { max-width:760px; margin:65px auto 42px; text-align:center; }
        .eyebrow,.step { font-size:10px; letter-spacing:2px; color:#8b794e; font-weight:700; }
        h1 { font-family:Georgia,'Times New Roman',serif; font-size:clamp(42px,6vw,72px); font-weight:400; letter-spacing:-2px; line-height:1.02; margin:18px 0; }
        h1 em { color:#8b794e; font-weight:400; }
        .hero-copy { max-width:510px; margin:0 auto; color:#70736b; line-height:1.7; font-size:14px; }
        .workspace { max-width:1040px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:stretch; }
        .panel { background:#fff; border:1px solid #e7e5df; border-radius:14px; padding:28px; box-shadow:0 8px 30px rgba(30,32,26,.035); }
        .panel-heading { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:25px; }
        h2 { margin:8px 0 0; font-family:Georgia,serif; font-weight:400; font-size:26px; }
        .live-dot { color:#56866b; font-size:9px; letter-spacing:1px; }
        .sparkle { color:#b79a5d; font-size:24px; }
        label { display:block; color:#555950; font-size:12px; font-weight:600; margin-bottom:17px; }
        label span { color:#96988f; font-weight:400; }
        input:not(.range) { display:block; box-sizing:border-box; width:100%; height:45px; margin-top:8px; padding:0 12px; border:1px solid #e2e3dd; border-radius:7px; background:#fbfbf9; color:#252821; font-size:15px; outline:none; }
        input:focus { border-color:#9a8657; box-shadow:0 0 0 3px rgba(154,134,87,.1); }
        .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .target-box { padding:15px; border-radius:9px; background:#f7f6f1; margin-top:2px; }
        .target-box label { display:flex; justify-content:space-between; margin-bottom:12px; }
        .target-box strong { color:#8b794e; }
        .range { width:100%; accent-color:#8b794e; }
        .range-labels { display:flex; justify-content:space-between; color:#999a92; font-size:10px; margin-top:6px; }
        .fine-print { color:#999a92; font-size:10px; line-height:1.5; margin:16px 0 0; }
        .profit-card { background:#22271f; border-radius:10px; padding:24px; color:#fff; }
        .profit-card>span:first-child { display:block; color:#c8c9c1; font-size:12px; }
        .profit-card strong { display:block; font-family:Georgia,serif; font-size:clamp(34px,4vw,48px); font-weight:400; margin:12px 0 8px; }
        .positive { color:#d7c18a; }.negative { color:#f3a7a0; }
        .profit-foot { color:#aeb2a7; font-size:10px; }
        .metrics { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:14px 0; }
        .metrics div { border:1px solid #e8e7e1; border-radius:9px; padding:15px; }
        .metrics span { display:block; color:#85877e; font-size:11px; margin-bottom:8px; }
        .metrics strong { font-size:19px; font-weight:600; }
        .recommendation { display:flex; align-items:center; gap:14px; border:1px solid #e4dece; background:#faf8f2; border-radius:9px; padding:16px; }
        .recommendation-icon { display:grid; place-items:center; width:36px; height:36px; border-radius:50%; background:#e8dfc8; color:#75613b; font-size:21px; }
        .recommendation strong { display:block; font-family:Georgia,serif; font-size:25px; font-weight:400; margin:5px 0; }
        .recommendation p,.launch-note p { margin:0; color:#85877e; font-size:11px; line-height:1.5; }
        .launch-note { display:flex; gap:12px; padding:17px 3px 0; margin-top:17px; border-top:1px solid #eeede8; }
        .note-icon { color:#9b8552; font-size:18px; }
        .launch-note strong { display:block; font-size:12px; margin-bottom:5px; }
        .page-footer { max-width:1040px; margin:38px auto 0; padding:20px 0 28px; border-top:1px solid #e2e1dc; display:flex; justify-content:space-between; gap:12px; color:#999a92; font-size:9px; letter-spacing:1px; }
        @media(max-width:760px) { .price-page{padding:0 5%;}.topbar{height:70px}.phase-pill{font-size:8px;padding:7px 9px}.hero{margin:48px auto 30px}.workspace{grid-template-columns:1fr}.panel{padding:22px}.page-footer{flex-direction:column;text-align:center} }
      `}</style>
    </main>
  );
}
