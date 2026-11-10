"use client";

import { useMemo, useState } from "react";
import { calculatePrice } from "@/lib/price-calculator";

const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);

type Marketplace = {
  name: string;
  price: string;
  feePercent: string;
  fulfilment: string;
};

const initialMarketplaces: Marketplace[] = [
  { name: "Amazon SA", price: "", feePercent: "15", fulfilment: "0" },
  { name: "Takealot", price: "", feePercent: "15", fulfilment: "0" },
  { name: "Makro", price: "", feePercent: "15", fulfilment: "0" },
];

export default function PriceCheckerPage() {
  const [productQuery, setProductQuery] = useState("");
  const [buyingCost, setBuyingCost] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [otherCosts, setOtherCosts] = useState("0");
  const [marketplaces, setMarketplaces] = useState(initialMarketplaces);
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => marketplaces.map((marketplace) => {
    const result = calculatePrice({
      buyingCost: Number(buyingCost) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      marketplaceFeePercent: Number(marketplace.feePercent) || 0,
      fixedFee: Number(marketplace.fulfilment) || 0,
      otherCosts: Number(otherCosts) || 0,
      targetMarginPercent: 0,
    });
    return { ...marketplace, result };
  }), [marketplaces, buyingCost, sellingPrice, otherCosts]);

  function updateMarketplace(index: number, field: "price" | "feePercent" | "fulfilment", value: string) {
    setMarketplaces((current) => current.map((marketplace, i) =>
      i === index ? { ...marketplace, [field]: value } : marketplace
    ));
  }

  function saveProduct() {
    const key = productQuery.trim();
    if (!key) {
      setNotice("Enter a product name or barcode first.");
      return;
    }
    if (saved.includes(key)) {
      setNotice("This product is already in your saved list.");
      return;
    }
    if (saved.length >= 5) {
      setNotice("You have reached the 5-product free allowance. Paid product limits will be added after billing is ready.");
      return;
    }
    setSaved((current) => [...current, key]);
    setNotice("Saved to your 5-product free list.");
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ekhaya Technologies home">
          <span className="brand-mark">E</span><span>EKHAYA <small>TECHNOLOGIES</small></span>
        </a>
        <span className="plan">PRICE CHECKER · MVP</span>
      </header>

      <section className="intro">
        <p className="eyebrow">SCAN. COMPARE. KNOW YOUR PROFIT.</p>
        <h1>Check before<br /><em>you buy.</em></h1>
        <p>Compare marketplace prices and estimate your profit after selling fees.</p>
      </section>

      <section className="lookup panel">
        <div>
          <span className="step">PRODUCT LOOKUP</span>
          <h2>Find a product</h2>
          <p>Enter a barcode or product name. Live marketplace matching will appear here once connected to a permitted product data source.</p>
        </div>
        <label className="query-label">Barcode or product name
          <input value={productQuery} onChange={(e) => { setProductQuery(e.target.value); setNotice(""); }} placeholder="e.g. 6001234567890 or product name" />
        </label>
        <div className="lookup-actions">
          <button className="primary" onClick={() => setNotice("Live lookup is not connected yet. Enter marketplace prices below to use the profit calculator.")}>Find product</button>
          <label className="upload">Add product photo<input type="file" accept="image/*" capture="environment" onChange={() => setNotice("Photo selected. Image-based product identification is not connected yet; use barcode or product name for now.")} /></label>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
      </section>

      <section className="calculator panel">
        <div className="section-head"><div><span className="step">PROFIT ESTIMATE</span><h2>Your numbers</h2></div><span className="estimate">ESTIMATE ONLY</span></div>
        <div className="seller-inputs">
          <label>Product cost (R)<input type="number" min="0" step="0.01" value={buyingCost} onChange={(e) => setBuyingCost(e.target.value)} /></label>
          <label>Your selling price (R)<input type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} /></label>
          <label>Other costs (R)<input type="number" min="0" step="0.01" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} /></label>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Marketplace</th><th>Listed price (R)</th><th>Fee (%)</th><th>Fulfilment (R)</th><th>Fees total</th><th>Profit estimate</th><th>Margin</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.name}>
              <td><strong>{row.name}</strong></td>
              <td><input aria-label={row.name + " comparison price"} type="number" min="0" step="0.01" placeholder="—" value={row.price} onChange={(e) => updateMarketplace(index, "price", e.target.value)} /></td>
              <td><input aria-label={row.name + " percentage fee"} type="number" min="0" max="100" step="0.1" value={row.feePercent} onChange={(e) => updateMarketplace(index, "feePercent", e.target.value)} /></td>
              <td><input aria-label={row.name + " fulfilment fee"} type="number" min="0" step="0.01" value={row.fulfilment} onChange={(e) => updateMarketplace(index, "fulfilment", e.target.value)} /></td>
              <td>{money(row.result.marketplaceFee)}</td>
              <td className={row.result.profit >= 0 ? "good" : "bad"}>{money(row.result.profit)}</td>
              <td>{row.result.marginPercent.toFixed(1)}%</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="disclaimer">Marketplace fees and fulfilment charges are estimates entered or adjusted by you. Actual charges vary by category, dimensions, weight and fulfilment method. Subscription fees are excluded from per-sale profit.</p>
      </section>

      <section className="saved panel">
        <div className="section-head"><div><span className="step">FREE ALLOWANCE</span><h2>Saved products <span className="count">{saved.length} / 5</span></h2></div><button className="secondary" onClick={saveProduct}>Save product</button></div>
        {saved.length ? <ul>{saved.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">Your saved products will appear here. Free access includes up to 5 saved products.</p>}
        <div className="tiers"><span>Next plans:</span><b>30</b><b>50</b><b>100</b><b>150+</b><span>products</span></div>
        <p className="muted small">Paid subscriptions are not available yet. Subscription prices and billing will be confirmed before launch.</p>
      </section>

      <footer>EKHAYA TECHNOLOGIES · BUILT FOR SOUTH AFRICAN RESELLERS</footer>
      <style jsx>{`
        .page{min-height:100vh;background:#f5f4f0;color:#20231f;padding:0 5%;font-family:Arial,Helvetica,sans-serif}
        .topbar{height:72px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e1dc}
        .brand{display:flex;gap:10px;align-items:center;color:#20231f;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:2px}
        .brand small{display:block;font-size:8px;letter-spacing:3px;margin-top:3px;font-weight:500}
        .brand-mark{width:34px;height:34px;display:grid;place-items:center;background:#22271f;color:#d8bd7c;border-radius:50%;font:23px Georgia}
        .plan,.estimate{font-size:10px;letter-spacing:1.2px;color:#77796f;border:1px solid #d9d7cf;border-radius:20px;padding:8px 11px}
        .intro{text-align:center;margin:46px auto 28px;max-width:600px}
        .eyebrow,.step{font-size:10px;letter-spacing:1.7px;color:#8b794e;font-weight:700}
        h1{font:400 clamp(40px,6vw,62px)/1.02 Georgia;margin:14px 0}
        h1 em{color:#8b794e}
        .intro p:last-child,.muted{color:#77796f;font-size:13px;line-height:1.6}
        .panel{max-width:1050px;margin:0 auto 16px;background:#fff;border:1px solid #e6e4de;border-radius:12px;padding:24px}
        h2{font:400 24px Georgia;margin:7px 0 12px}
        .lookup{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:end}
        .lookup p{font-size:12px;color:#77796f;line-height:1.6;margin:0}
        label{display:block;font-size:12px;color:#5e6058;font-weight:600}
        input{box-sizing:border-box;width:100%;height:40px;margin-top:7px;padding:0 10px;border:1px solid #deded8;border-radius:6px;background:#fbfbf9;color:#222;font-size:14px}
        input:focus{outline:2px solid #d9c99e;border-color:#9c8756}
        .lookup-actions{display:flex;gap:10px;align-items:center}
        button{border:0;border-radius:6px;padding:11px 16px;font-size:12px;font-weight:700;cursor:pointer}
        .primary{background:#22271f;color:#f4e5bd}
        .secondary{background:#e9e2d2;color:#3c382d}
        .upload{position:relative;display:inline-block;border:1px solid #deded8;border-radius:6px;padding:10px 12px;cursor:pointer;white-space:nowrap}
        .upload input{position:absolute;inset:0;opacity:0;cursor:pointer}
        .notice{grid-column:1/-1;margin:0;color:#75613b;font-size:12px}
        .section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}
        .seller-inputs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}
        .table-wrap{overflow-x:auto}
        table{width:100%;border-collapse:collapse;min-width:760px;font-size:12px}
        th{text-align:left;background:#f4f3ef;color:#696b62;font-weight:600}
        th,td{padding:12px 10px;border-bottom:1px solid #e8e7e1}
        td input{min-width:78px;height:34px;margin:0}
        .good{color:#397653;font-weight:700}.bad{color:#b4473c;font-weight:700}
        .disclaimer{font-size:11px;color:#85877e;line-height:1.6;margin:16px 0 0}
        .count{font:12px Arial;color:#8b794e;margin-left:8px}
        .saved ul{margin:0;padding-left:18px;font-size:13px}
        .tiers{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid #ecebe5;margin-top:18px;padding-top:15px;font-size:12px;color:#77796f}
        .tiers b{background:#f4f1e8;border-radius:5px;padding:7px 10px;color:#51472f}
        .small{font-size:11px}
        footer{max-width:1050px;margin:0 auto;padding:20px 0 30px;text-align:center;color:#999a92;font-size:9px;letter-spacing:1.2px}
        @media(max-width:720px){.page{padding:0 4%}.topbar{height:65px}.plan{font-size:8px}.intro{margin:35px auto 24px}.panel{padding:18px}.lookup{grid-template-columns:1fr}.seller-inputs{grid-template-columns:1fr}.lookup-actions{flex-wrap:wrap}.section-head{align-items:flex-start}}
      `}</style>
    </main>
  );
}
