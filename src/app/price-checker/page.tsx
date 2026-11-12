"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type MarketplaceProduct = { marketplace?: string; id: string; title: string; brand?: string | null; price: number | null; currency: string; image?: string | null; url?: string | null; in_stock?: boolean | null; rating?: number | null; review_count?: number | null; seller?: string | null; };

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMarketplace, setSearchMarketplace] = useState<"takealot" | "amazon" | "both">("both");
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchSource, setSearchSource] = useState("");

  async function searchMarketplaceProducts() {
    if (searchQuery.trim().length < 2) {
      setSearchError("Enter at least 2 characters to search.");
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    setProducts([]);
    setSearchSource("");
    const targets = searchMarketplace === "both" ? ["takealot", "amazon"] as const : [searchMarketplace] as const;
    const errors: string[] = [];
    let completed = 0;
    await Promise.all(targets.map(async (marketplace) => {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);
        const response = await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eHhuaGNqaml5bnJtaXZleGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MjA0MjEsImV4cCI6MjEwOTQ5NjQyMX0.f6nIHY00_1p0bu7E84RkVVa1832UrFpiLIu5SLxzLFU",
          },
          body: JSON.stringify({ marketplace, query: searchQuery.trim() }),
          signal: controller.signal,
        }).finally(() => window.clearTimeout(timeoutId));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Search failed");
        const incoming = (payload.products ?? []).map((product: MarketplaceProduct) => ({ ...product, marketplace }));
        setProducts((current) => [...current.filter((item) => item.marketplace !== marketplace), ...incoming]);
        setSearchSource((current) => current === "Shared cache" && payload.source !== "cache"
          ? "Live marketplace data"
          : payload.source === "cache" ? "Shared cache" : "Live marketplace data");
      } catch (error) {
        const message = error instanceof Error && error.name === "AbortError"
          ? "Request timed out"
          : error instanceof Error ? error.message : "Search failed";
        errors.push(`${marketplace === "amazon" ? "Amazon SA" : "Takealot"}: ${message}`);
        setSearchError(errors.join(" · "));
      } finally {
        completed += 1;
        if (completed === targets.length) setSearchLoading(false);
      }
    }));
  }

  const result = useMemo(() => {
    const buying = Math.max(0, Number(cost) || 0);
    const price = Math.max(0, Number(sellingPrice) || 0);
    const feeRate = Math.min(100, Math.max(0, Number(feePercent) || 0)) / 100;
    const fixed = Math.max(0, Number(fixedFee) || 0);
    const delivery = Math.max(0, Number(shipping) || 0);
    const marginTarget = Math.min(95, Math.max(0, Number(targetMargin) || 0)) / 100;
    const marketplaceFee = price * feeRate + fixed;
    const netProfit = price - buying - marketplaceFee - delivery;
    const margin = price > 0 ? (netProfit / price) * 100 : 0;
    const suggested = (buying + fixed + delivery) / (1 - feeRate - marginTarget);

    return { marketplaceFee, netProfit, margin, suggested };
  }, [cost, sellingPrice, feePercent, fixedFee, shipping, targetMargin]);

  return (
    <main className="price-page">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Ekhaya Technologies home">
          <Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={230} height={190} priority className="brand-logo" />
        </Link>
        <span className="phase-pill">PRICE INTELLIGENCE · LIVE RESEARCH</span>
      </header>

      <section className="hero">
        <p className="eyebrow">SELL SMARTER. PRICE WITH CONFIDENCE.</p>
        <h1>Know your numbers<br /><em>before you buy.</em></h1>
        <p className="hero-copy">
          Check your potential profit, account for marketplace costs, and find a
          selling price that works for your business.
        </p>
      </section>

      <section className="search-panel panel">
        <div className="panel-heading">
          <div><span className="step">LIVE PRODUCT RESEARCH</span><h2>Search marketplace listings</h2></div>
          <span className="live-dot">● CONNECTED</span>
        </div>
        <div className="search-controls">
          <input aria-label="Product search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchMarketplaceProducts(); }} placeholder="Search a product, e.g. wireless mouse" />
          <select aria-label="Marketplace" value={searchMarketplace} onChange={(e) => setSearchMarketplace(e.target.value as "takealot" | "amazon")}>
            <option value="both">Compare both marketplaces</option><option value="takealot">Takealot only</option><option value="amazon">Amazon South Africa only</option>
          </select>
          <button type="button" onClick={searchMarketplaceProducts} disabled={searchLoading}>{searchLoading ? "Searching…" : "Search products"}</button>
        </div>
        {searchLoading && products.length > 0 && <p className="search-source" role="status">Results are arriving; checking the other marketplace…</p>}
        {searchError && <p className="search-error" role="status">{searchError}</p>}
        {searchSource && <p className="search-source">{searchSource} · Prices are indicative and can change at any time.</p>}
        {products.length > 0 && <div className="product-results">{products.map((product, index) => <article className="product-result" key={product.id || index}>
          {product.image ? <img src={product.image} alt="" /> : <div className="product-placeholder">E</div>}
          <div className="product-info"><strong>{product.title}</strong><span>{product.marketplace === "amazon" ? "Amazon SA" : "Takealot"} · {product.brand ?? "Marketplace listing"}{product.rating ? ` · ★ ${product.rating}` : ""}{product.review_count ? ` (${product.review_count})` : ""}</span><b>{product.price == null ? "Price unavailable" : new Intl.NumberFormat("en-ZA", { style: "currency", currency: product.currency || "ZAR" }).format(product.price)}</b><small>{product.in_stock === true ? "In stock" : product.in_stock === false ? "Currently unavailable" : "Stock not confirmed"}</small>{product.url && <a href={product.url} target="_blank" rel="noreferrer">View listing ↗</a>}</div>
        </article>)}</div>}
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
            <strong className={result.netProfit >= 0 ? "positive" : "negative"}>{money(result.netProfit)}</strong>
            <span className="profit-foot">After entered costs and marketplace fees</span>
          </div>

          <div className="metrics">
            <div><span>Profit margin</span><strong>{result.margin.toFixed(1)}%</strong></div>
            <div><span>Marketplace fees</span><strong>{money(result.marketplaceFee)}</strong></div>
          </div>

          <div className="recommendation">
            <div className="recommendation-icon">↗</div>
            <div>
              <span className="step">SUGGESTED SELLING PRICE</span>
              <strong>{Number.isFinite(result.suggested) ? money(result.suggested) : "—"}</strong>
              <p>Estimated price to reach your selected margin.</p>
            </div>
          </div>

          <div className="launch-note">
            <span className="note-icon">✦</span>
            <div><strong>Marketplace research is now connected</strong><p>Search live Takealot and Amazon South Africa listings above. Compare listing prices, then use the calculator to estimate your margin.</p></div>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <span>DIGITAL SOLUTIONS · BUILT FOR SOUTH AFRICAN SELLERS</span>
        <span>EKHAYA TECHNOLOGIES © 2026</span>
      </footer>

      <style jsx>{`
        .price-page { min-height: 100vh; background: #F4F8FC; color: #071B31; padding: 0 5.5%; font-family: 'DM Sans', 'Manrope', Arial, sans-serif; }
        .topbar { height: 82px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #DCE8F1; }
        .brand { display:flex; align-items:center; color:#071B31; text-decoration:none; }\n        .brand-logo { display:block; width:154px; height:auto; }
        
        .brand-mark { width:34px; height:34px; display:grid; place-items:center; background:#071B31; color:#FFFFFF; font-family:'Manrope',Arial,sans-serif; font-size:23px; border-radius:50%; }
        .phase-pill { border:1px solid #d8d6cf; border-radius:30px; padding:9px 13px; color:#686b62; font-size:9px; letter-spacing:1.5px; }
        .hero { max-width:760px; margin:65px auto 42px; text-align:center; }
        .eyebrow,.step { font-size:10px; letter-spacing:2px; color:#079BD3; font-weight:700; }
        h1 { font-family:'Manrope',Arial,sans-serif; font-size:clamp(42px,6vw,72px); font-weight:400; letter-spacing:-2px; line-height:1.02; margin:18px 0; }
        h1 em { color:#079BD3; font-weight:400; }
        .hero-copy { max-width:510px; margin:0 auto; color:#60758A; line-height:1.7; font-size:14px; }
        .search-panel { max-width:1040px; margin:0 auto 20px; }
        .search-controls { display:grid; grid-template-columns:1fr 190px auto; gap:10px; }
        .search-controls input,.search-controls select { min-width:0; height:46px; border:1px solid #DCE8F1; border-radius:8px; padding:0 12px; color:#071B31; background:#fff; }
        .search-controls button { border:0; border-radius:8px; padding:0 18px; background:#079BD3; color:#fff; font-weight:700; cursor:pointer; }
        .search-controls button:disabled { opacity:.6; cursor:wait; }
        .search-error { color:#B42318; font-size:12px; margin:12px 0 0; }
        .search-source { color:#60758A; font-size:11px; margin:12px 0 0; }
        .product-results { display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:12px; margin-top:18px; }
        .product-result { display:flex; gap:12px; border:1px solid #DCE8F1; border-radius:10px; padding:12px; min-width:0; }
        .product-result img,.product-placeholder { width:76px; height:76px; flex:0 0 76px; object-fit:contain; border-radius:7px; background:#F4F8FC; }
        .product-placeholder { display:grid; place-items:center; color:#079BD3; font-size:28px; font-weight:800; }
        .product-info { display:flex; flex-direction:column; align-items:flex-start; gap:5px; min-width:0; }
        .product-info strong { font-size:12px; line-height:1.4; }
        .product-info span,.product-info small { color:#60758A; font-size:10px; }
        .product-info b { color:#071B31; font-size:16px; }
        .product-info a { color:#079BD3; font-size:10px; font-weight:700; }
        .workspace { max-width:1040px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:stretch; }
        .panel { background:#fff; border:1px solid #DCE8F1; border-radius:14px; padding:28px; box-shadow:0 8px 30px rgba(30,32,26,.035); }
        .panel-heading { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:25px; }
        h2 { margin:8px 0 0; font-family:Georgia,serif; font-weight:400; font-size:26px; }
        .live-dot { color:#079BD3; font-size:9px; letter-spacing:1px; }
        .sparkle { color:#00A9E8; font-size:24px; }
        label { display:block; color:#304B63; font-size:12px; font-weight:600; margin-bottom:17px; }
        label span { color:#8195A8; font-weight:400; }
        input:not(.range) { display:block; box-sizing:border-box; width:100%; height:45px; margin-top:8px; padding:0 12px; border:1px solid #DCE8F1; border-radius:7px; background:#FFFFFF; color:#071B31; font-size:15px; outline:none; }
        input:focus { border-color:#079BD3; box-shadow:0 0 0 3px rgba(7,155,211,.12); }
        .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .target-box { padding:15px; border-radius:9px; background:#F4F8FC; margin-top:2px; }
        .target-box label { display:flex; justify-content:space-between; margin-bottom:12px; }
        .target-box strong { color:#079BD3; }
        .range { width:100%; accent-color:#079BD3; }
        .range-labels { display:flex; justify-content:space-between; color:#8195A8; font-size:10px; margin-top:6px; }
        .fine-print { color:#8195A8; font-size:10px; line-height:1.5; margin:16px 0 0; }
        .profit-card { background:#071B31; border-radius:10px; padding:24px; color:#fff; }
        .profit-card>span:first-child { display:block; color:#D4E2EC; font-size:12px; }
        .profit-card strong { display:block; font-family:Georgia,serif; font-size:clamp(34px,4vw,48px); font-weight:400; margin:12px 0 8px; }
        .positive { color:#00A9E8; }.negative { color:#f3a7a0; }
        .profit-foot { color:#B6C8D7; font-size:10px; }
        .metrics { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:14px 0; }
        .metrics div { border:1px solid #DCE8F1; border-radius:9px; padding:15px; }
        .metrics span { display:block; color:#60758A; font-size:11px; margin-bottom:8px; }
        .metrics strong { font-size:19px; font-weight:600; }
        .recommendation { display:flex; align-items:center; gap:14px; border:1px solid #DCE8F1; background:#F4F8FC; border-radius:9px; padding:16px; }
        .recommendation-icon { display:grid; place-items:center; width:36px; height:36px; border-radius:50%; background:#D9F1FA; color:#079BD3; font-size:21px; }
        .recommendation strong { display:block; font-family:Georgia,serif; font-size:25px; font-weight:400; margin:5px 0; }
        .recommendation p,.launch-note p { margin:0; color:#60758A; font-size:11px; line-height:1.5; }
        .launch-note { display:flex; gap:12px; padding:17px 3px 0; margin-top:17px; border-top:1px solid #DCE8F1; }
        .note-icon { color:#079BD3; font-size:18px; }
        .launch-note strong { display:block; font-size:12px; margin-bottom:5px; }
        .page-footer { max-width:1040px; margin:38px auto 0; padding:20px 0 28px; border-top:1px solid #DCE8F1; display:flex; justify-content:space-between; gap:12px; color:#8195A8; font-size:9px; letter-spacing:1px; }
        @media(max-width:760px) { .search-controls { grid-template-columns:1fr; }.search-controls button { min-height:44px; }.price-page{padding:0 5%;}.topbar{height:70px}.phase-pill{font-size:8px;padding:7px 9px}.hero{margin:48px auto 30px}.workspace{grid-template-columns:1fr}.panel{padding:22px}.page-footer{flex-direction:column;text-align:center} }
      `}</style>
    </main>
  );
}
