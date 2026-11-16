"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const SUPABASE_KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
type Notice = { id: string; title: string; message: string; notification_type: string; action_url: string | null; created_at: string; read_at: string | null };

export default function SellerNotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [status, setStatus] = useState("Loading your notifications…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      let session: { access_token?: string } | null = null;
      try { session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null"); } catch { /* invalid local session */ }
      if (!session?.access_token) throw new Error("Please sign in to view your notifications.");
      const response = await fetch(SUPABASE_URL + "/rest/v1/user_notifications?select=id,title,message,notification_type,action_url,created_at,read_at&order=created_at.desc&limit=100", {
        headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + session.access_token }
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message ?? "Could not load notifications.");
      setItems(Array.isArray(data) ? data : []);
      setStatus(data.length ? data.length + " notifications loaded." : "You’re all caught up. New account and credit updates will appear here.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load notifications.");
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markRead(item: Notice) {
    if (item.read_at) return;
    let session: { access_token?: string } | null = null;
    try { session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null"); } catch { /* invalid local session */ }
    if (!session?.access_token) { setStatus("Please sign in again."); return; }
    const response = await fetch(SUPABASE_URL + "/rest/v1/user_notifications?id=eq." + encodeURIComponent(item.id), {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() })
    });
    if (!response.ok) { setStatus("Could not mark this notification as read."); return; }
    setItems(old => old.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
  }

  const unread = items.filter(item => !item.read_at).length;
  return <main style={{ minHeight: "100vh", background: "#F4F8FC", padding: "28px 5%", color: "#071B31", fontFamily: "Arial,sans-serif" }}>
    <header style={{ maxWidth: 850, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <b>EKHAYA PRICE CHECKER</b><nav style={{ display: "flex", gap: 16, fontSize: 13 }}><Link href="/account/" style={{ color: "#079BD3" }}>Account</Link><Link href="/price-checker/" style={{ color: "#079BD3" }}>Price checker</Link></nav>
    </header>
    <section style={{ maxWidth: 850, margin: "38px auto", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 26 }}>
      <p style={{ color: "#079BD3", fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>SELLER UPDATES</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><h1 style={{ fontSize: 29, margin: "8px 0" }}>Notifications</h1><p style={{ color: "#60758A", fontSize: 13, margin: 0 }}>{unread} unread updates</p></div><button onClick={() => void load()} disabled={busy} style={{ padding: "11px 16px", border: 0, borderRadius: 7, background: "#071B31", color: "#fff", fontWeight: 700 }}>{busy ? "Refreshing…" : "Refresh"}</button></div>
      <div style={{ marginTop: 24 }}>
        {items.map(item => <article key={item.id} style={{ padding: 18, marginBottom: 12, border: "1px solid #DCE8F1", borderLeft: item.read_at ? "3px solid #DCE8F1" : "3px solid #079BD3", borderRadius: 9, background: item.read_at ? "#fff" : "#F7FBFE" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><b style={{ fontSize: 15 }}>{item.title}</b><span style={{ color: "#71869A", fontSize: 11 }}>{new Date(item.created_at).toLocaleString("en-ZA")}</span></div>
          <p style={{ color: "#40566B", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{item.message}</p>
          <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 12 }}>{item.action_url && <a href={item.action_url} style={{ color: "#079BD3", fontWeight: 700 }}>View details →</a>}{!item.read_at && <button onClick={() => void markRead(item)} style={{ border: 0, background: "transparent", color: "#60758A", cursor: "pointer" }}>Mark as read</button>}</div>
        </article>)}
        {!items.length && <p style={{ padding: 24, textAlign: "center", color: "#71869A" }}>{status}</p>}
      </div>
      {items.length > 0 && <p role="status" aria-live="polite" style={{ fontSize: 12, color: "#60758A", marginTop: 14 }}>{status}</p>}
    </section>
  </main>;
}
