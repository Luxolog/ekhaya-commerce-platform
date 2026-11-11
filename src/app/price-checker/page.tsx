"use client";

import { useEffect, useMemo, useState } from "react";
import { calculatePrice } from "@/lib/price-calculator";
import BarcodeScanner from "@/components/price-checker/BarcodeScanner";
import { PRICE_CHECKER_PLAN_LIMITS, WELCOME_FREE_COMPARISONS, getMonthlyApiCallAllowance, getWelcomeApiCallAllowance } from "@/lib/subscription-plans";

const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);

type SavedProduct = {
  id: string;
  name: string;
  barcode: string;
  buyingCost: number;
  sellingPrice: number;
  otherCosts: number;
  savedAt: string;
};

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
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const [savedReady, setSavedReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("ekhaya-price-checker-saved-v1");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.flatMap((item): SavedProduct[] => {
            if (typeof item === "string") {
              return [{ id: item.toLocaleLowerCase(), name: item, barcode: "", buyingCost: 0, sellingPrice: 0, otherCosts: 0, savedAt: "" }];
            }
            if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
              const p = item as Partial<SavedProduct>;
              return [{ id: typeof p.id === "string" ? p.id : p.name.toLocaleLowerCase(), name: p.name, barcode: typeof p.barcode === "string" ? p.barcode : "", buyingCost: Number(p.buyingCost) || 0, sellingPrice: Number(p.sellingPrice) || 0, otherCosts: Number(p.otherCosts) || 0, savedAt: typeof p.savedAt === "string" ? p.savedAt : "" }];
            }
            return [];
          });
          setSaved(valid.slice(0, 5));
        }
      }
    } catch {
      // Saved products remain usable in memory if browser storage is unavailable.
    } finally {
      setSavedReady(true);
    }
  }, []);

  useEffect(() => {
    if (!savedReady) return;
    try {
      window.localStorage.setItem("ekhaya-price-checker-saved-v1", JSON.stringify(saved));
    } catch {
      // Storage may be disabled or full; do not interrupt the calculator.
    }
  }, [saved, savedReady]);
  const [notice, setNotice] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);

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

  async function findProduct() {
    const query = productQuery.trim();
    if (!query) { setNotice("Enter a barcode or product name first."); return; }
    setLookupLoading(true); setLookupResults([]); setNotice("");
    try {
      const response = await fetch(`/api/price-checker/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) { setNotice(data.error || "Lookup is not available."); return; }
      setLookupResults(data.results || []);
      setNotice("Search candidates returned. Confirm the product and listed price on the marketplace before relying on it.");
    } catch { setNotice("Could not complete lookup. Please try again."); }
    finally { setLookupLoading(false); }
  }

  function saveProduct() {
    const key = productQuery.trim();
    if (!key) {
      setNotice("Enter a product name or barcode first.");
      return;
    }
    if (saved.some((item) => item.name.toLocaleLowerCase() === key.toLocaleLowerCase())) {
      setNotice("This product is already in your saved list.");
      return;
    }
    if (saved.length >= 5) {
      setNotice("You have reached the 5-product free allowance. Paid product limits will be added after billing is ready.");
      return;
    }
    const product: SavedProduct = {
      id: `${key.toLocaleLowerCase()}-${Date.now()}`,
      name: key,
      barcode: /^\d{8,14}$/.test(key) ? key : "",
      buyingCost: Math.max(0, Number(buyingCost) || 0),
      sellingPrice: Math.max(0, Number(sellingPrice) || 0),
      otherCosts: Math.max(0, Number(otherCosts) || 0),
      savedAt: new Date().toISOString(),
    };
    setSaved((current) => [...current, product]);
    setNotice("Saved product details and current cost assumptions.");
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
          <p>Enter a barcode or product name, or scan a barcode with your camera. Marketplace results are search candidates; confirm the exact match and current price.</p>
        </div>
        <label className="query-label">Barcode or product name
          <input value={productQuery} onChange={(e) => { setProductQuery(e.target.value); setNotice(""); }} placeholder="e.g. 6001234567890 or product name" />
        </label>
        <div className="lookup-actions">
          <BarcodeScanner onDetected={setProductQuery} />
          <button className="primary" onClick={findProduct} disabled={lookupLoading}>{lookupLoading ? "Searching…" : "Find product"}</button>
          <label className="upload">Add product photo<input type="file" accept="image/*" capture="environment" onChange={() => setNotice("Photo selected. Image-based product identification is not connected yet; use barcode or product name for now.")} /></label>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
        {lookupResults.length > 0 && <div className="lookup-results">{lookupResults.map((group) => <section key={group.marketplace}><h3>{group.marketplace}</h3>{group.error && <p>{group.error}</p>}{group.results?.length ? group.results.map((item: any) => <article key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a><p>{item.snippet}</p><small>Candidate result · verify price and exact match</small></article>) : <p>No candidate results found.</p>}</section>)}</div>}
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
            <thead><tr><th>Marketplace</th><th>Listed price (R)</th><th>Fee (%)</th><th>Fulfilment (R)</th><th>Gross profit before fees</th><th>Estimated fees</th><th>Profit after fees</th><th>Margin</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.name}>
              <td><strong>{row.name}</strong></td>
              <td><input aria-label={row.name + " comparison price"} type="number" min="0" step="0.01" placeholder="—" value={row.price} onChange={(e) => updateMarketplace(index, "price", e.target.value)} /></td>
              <td><input aria-label={row.name + " percentage fee"} type="number" min="0" max="100" step="0.1" value={row.feePercent} onChange={(e) => updateMarketplace(index, "feePercent", e.target.value)} /></td>
              <td><input aria-label={row.name + " fulfilment fee"} type="number" min="0" step="0.01" value={row.fulfilment} onChange={(e) => updateMarketplace(index, "fulfilment", e.target.value)} /></td>
              <td>{money((Number(sellingPrice) || 0) - (Number(buyingCost) || 0) - (Number(otherCosts) || 0))}</td>
              <td>{money(row.result.marketplaceFee)}</td>
              <td className={row.result.profit >= 0 ? "good" : "bad"}>{money(row.result.profit)}</td>
              <td>{row.result.marginPercent.toFixed(1)}%</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="disclaimer">Gross profit is before marketplace fees. Profit after fees subtracts the estimated percentage fee, fulfilment fee and other costs entered. Fees are estimates and can vary by category, product dimensions, weight and fulfilment method. Subscription fees are excluded from per-sale profit.</p>
      </section>

      <section className="saved panel">
        <div className="section-head"><div><span className="step">SAVED PRODUCTS</span><h2>Saved products <span className="count">{saved.length} / 5</span></h2></div><button className="secondary" onClick={saveProduct} disabled={saved.length >= 5} title={saved.length >= 5 ? "Remove a saved product to make room" : "Save this product and its current cost assumptions"}>Save product</button></div>
        {saved.length ? <ul>{saved.map((item) => <li key={item.id}><div className="saved-details"><strong>{item.name}</strong>{item.barcode && <small>Barcode: {item.barcode}</small>}<small>Cost {money(item.buyingCost)} · Selling {money(item.sellingPrice)} · Other costs {money(item.otherCosts)}</small>{item.savedAt && <small>Saved {new Date(item.savedAt).toLocaleDateString("en-ZA")}</small>}</div><button className="secondary" type="button" onClick={() => { setProductQuery(item.name); setBuyingCost(String(item.buyingCost)); setSellingPrice(String(item.sellingPrice)); setOtherCosts(String(item.otherCosts)); setNotice(`Loaded ${item.name} and its saved cost assumptions into the calculator.`); }}>Use values</button><button className="remove" type="button" aria-label={`Remove ${item.name} from saved products`} onClick={() => { setSaved((current) => current.filter((savedItem) => savedItem.id !== item.id)); setNotice(`${item.name} removed from saved products.`); }}>Remove</button></li>)}</ul> : <p className="muted">Your saved products will appear here. Free access includes up to 5 saved products.</p>}
        <section className="plans">
          <div className="welcome-offer"><strong>{WELCOME_FREE_COMPARISONS} free product comparisons when you register</strong><span>That is {getWelcomeApiCallAllowance()} marketplace searches across Amazon SA, Takealot and Makro. This is a once-off welcome offer, separate from your paid monthly allowance.</span></div>
          <div className="section-head"><div><span className="step">SUBSCRIPTION OPTIONS</span><h2>Choose your search allowance</h2><p className="muted">One product comparison checks Amazon SA, Takealot and Makro. Paid subscriptions renew on the 1st of each month.</p></div><span className="plan">COMING SOON</span></div>
          <div className="plan-grid">
            {Object.entries(PRICE_CHECKER_PLAN_LIMITS).map(([planId, tier]) => <article className="plan-card" key={planId}>
              <span>{tier.name}</span><strong>{money("introductoryFirstMonthPriceZar" in tier ? tier.introductoryFirstMonthPriceZar : tier.monthlyPriceZar)}<small> / first month</small></strong>
              {"introductoryFirstMonthPriceZar" in tier && <small>Then {money(tier.monthlyPriceZar)} / month</small>}
              <b>{tier.productComparisons} product comparisons / month</b>
              <small>{getMonthlyApiCallAllowance(planId as keyof typeof PRICE_CHECKER_PLAN_LIMITS)} marketplace API calls included</small>
            </article>)}
          </div>
          <p className="muted small">The Basic introductory price is for the first paid month only. Standard, Advanced and Premium start at their listed monthly prices. Renewals are scheduled for the 1st of each month; checkout will show your next renewal date before payment.</p>
          <p className="muted small">Plans are displayed for pricing feedback only. Accounts, usage tracking and subscription payments are not active yet.</p>
        </section>
        <p className="muted small">Saved-product capacity is separate from your search allowance. Paid subscriptions are not available yet.</p>
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
        .secondary{background:#e9e2d2;color:#3c382d}.secondary:disabled{opacity:.5;cursor:not-allowed}
        .upload{position:relative;display:inline-block;border:1px solid #deded8;border-radius:6px;padding:10px 12px;cursor:pointer;white-space:nowrap}
        .upload input{position:absolute;inset:0;opacity:0;cursor:pointer}
        .notice{grid-column:1/-1;margin:0;color:#75613b;font-size:12px}
        .lookup-results{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:10px}.lookup-results section{border:1px solid #e6e4de;border-radius:8px;padding:12px}.lookup-results h3{font:16px Georgia;margin:0 0 10px}.lookup-results article{padding:10px 0;border-top:1px solid #eee}.lookup-results a{color:#51472f;font-size:12px;font-weight:700}.lookup-results article p{margin:6px 0;font-size:11px}.lookup-results small{color:#8b794e;font-size:10px}
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
         .saved ul{margin:0;padding:0;list-style:none;font-size:13px}.saved li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #efeee8}.saved-details{display:grid;gap:4px}.saved-details small{font-size:11px;color:#77796f}.remove{background:transparent;color:#8a5147;padding:6px 8px;font-size:11px}
        .plans{border-top:1px solid #ecebe5;margin-top:22px;padding-top:20px}
        .welcome-offer{display:grid;gap:6px;margin-bottom:18px;padding:14px 16px;border:1px solid #d9c99e;border-radius:8px;background:#fbfaf6;color:#3c382d}.welcome-offer strong{font:17px Georgia}.welcome-offer span{font-size:11px;color:#77796f;line-height:1.5}
        .plan-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .plan-card{display:grid;gap:9px;border:1px solid #e6e4de;border-radius:8px;padding:15px;background:#fbfbf9}
        .plan-card>span{font-size:11px;color:#8b794e;font-weight:700;text-transform:uppercase;letter-spacing:1px}
        .plan-card strong{font:24px Georgia;color:#22271f}
        .plan-card strong small,.plan-card>small{font:11px Arial;color:#77796f}
        .plan-card>b{font-size:12px;color:#3c382d}
        .small{font-size:11px}
        footer{max-width:1050px;margin:0 auto;padding:20px 0 30px;text-align:center;color:#999a92;font-size:9px;letter-spacing:1.2px}
        @media(max-width:720px){.plan-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.page{padding:0 4%}.topbar{height:65px}.plan{font-size:8px}.intro{margin:35px auto 24px}.panel{padding:18px}.lookup{grid-template-columns:1fr}.seller-inputs{grid-template-columns:1fr}.lookup-actions{flex-wrap:wrap}.lookup-results{grid-template-columns:1fr}.section-head{align-items:flex-start}}
      `}</style>
    </main>
  );
}
