"use client";

import { useState } from "react";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

type Product = {
  id?: string;
  title?: string;
  price?: number | null;
  currency?: string;
  image?: string | null;
  url?: string | null;
  rating?: number | null;
  review_count?: number | null;
};

export default function AmazonConnectionTestPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready to test Amazon South Africa.");
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

  async function getHeaders() {
    let session: Record<string, any> | null = null;
    try {
      const raw = localStorage.getItem("ekhaya_session");
      session = raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("ekhaya_session");
    }
    if (!session?.access_token) throw new Error("Please sign in to your Ekhaya seller account first.");
    const expiresAt = Number(session.expires_at ?? 0);
    if (expiresAt > Date.now() + 60000) {
      return {
        "Content-Type": "application/json",
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      };
    }
    if (!session.refresh_token) throw new Error("Your sign-in has expired. Please sign in again.");
    const refreshed = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: PUBLISHABLE_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const next = await refreshed.json();
    if (!refreshed.ok || !next.access_token) {
      localStorage.removeItem("ekhaya_session");
      throw new Error("Your sign-in has expired. Please sign in again.");
    }
    session = { ...next, expires_at: Date.now() + Number(next.expires_in ?? 3600) * 1000 };
    localStorage.setItem("ekhaya_session", JSON.stringify(session));
    return {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${next.access_token}`,
    };
  }

  async function runTest() {
    setLoading(true);
    setProducts([]);
    setMeta(null);
    setMessage("Contacting the isolated Amazon South Africa test…");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/marketplace-search-test`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ marketplace: "amazon", query: "Samsung Galaxy A16" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.error || `Request failed (${response.status})`);
      setProducts(Array.isArray(result.products) ? result.products : []);
      setMeta(result.provider_meta ?? null);
      const count = Array.isArray(result.products) ? result.products.length : 0;
      setMessage(count
        ? `Success: Amazon test returned ${count} product listing(s). No seller credits were charged.`
        : "The API responded, but returned no products for this search.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The test could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  const money = (value: unknown) => typeof value === "number"
    ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value)
    : "Price not supplied";

  return (
    <main style={{ maxWidth: 820, margin: "40px auto", padding: "0 20px", color: "#10243a", fontFamily: "Arial, sans-serif" }}>
      <a href="/price-checker/" style={{ color: "#078fc3" }}>← Back to Price Checker</a>
      <h1 style={{ marginBottom: 8 }}>Amazon South Africa connection test</h1>
      <p style={{ color: "#61758a", lineHeight: 1.6 }}>This private diagnostic page checks the isolated Supabase test function. It does not change the live marketplace search, deduct seller credits, or write to the shared product cache.</p>
      <button onClick={runTest} disabled={loading} style={{ padding: "14px 22px", border: 0, borderRadius: 8, background: "#078fc3", color: "white", fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? .65 : 1 }}>
        {loading ? "Testing connection…" : "Run Amazon test"}
      </button>
      <div role="status" style={{ marginTop: 18, padding: 16, borderRadius: 8, background: "#f1f6fa", lineHeight: 1.6 }}>{message}</div>
      {meta && <details style={{ marginTop: 14 }}><summary>Provider response details</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{JSON.stringify(meta, null, 2)}</pre></details>}
      {products.length > 0 && <section style={{ marginTop: 22 }}>
        <h2>Returned Amazon listings ({products.length})</h2>
        {products.map((p, i) => <article key={String(p.id ?? i)} style={{ display: "flex", gap: 14, padding: 14, border: "1px solid #dce6ee", borderRadius: 10, marginBottom: 12 }}>
          {p.image && <img src={p.image} alt="" style={{ width: 92, height: 92, objectFit: "contain" }} />}
          <div><strong>{p.title || "Untitled listing"}</strong><p style={{ fontSize: 18, fontWeight: 700 }}>{money(p.price)}</p>
            <small>{p.rating ? `Rating ${p.rating}` : "No rating supplied"}{p.review_count ? ` · ${p.review_count} reviews` : ""}</small>
            {p.url && <p><a href={p.url} target="_blank" rel="noreferrer">Open Amazon listing ↗</a></p>}
          </div>
        </article>)}
      </section>}
      <p style={{ color: "#71869a", fontSize: 12, marginTop: 24 }}>Do not share browser tokens or passwords. This test is for technical validation only; commercial-use permission must be confirmed before Amazon is enabled for paying customers.</p>
    </main>
  );
}
