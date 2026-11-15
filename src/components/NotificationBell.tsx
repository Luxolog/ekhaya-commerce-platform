"use client";

import { useCallback, useEffect, useState } from "react";

const SUPABASE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const ANON_KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

type Notice = {
  id: string;
  title: string;
  message: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
      if (!session?.access_token) return;
      const response = await fetch(
        SUPABASE_URL + "/rest/v1/user_notifications?select=id,title,message,action_url,read_at,created_at&order=created_at.desc&limit=30",
        { headers: { apikey: ANON_KEY, Authorization: "Bearer " + session.access_token } }
      );
      if (!response.ok) throw new Error("Notifications could not be loaded.");
      setItems(await response.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notifications could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function markRead(id: string) {
    const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
    if (!session?.access_token) return;
    const response = await fetch(SUPABASE_URL + "/rest/v1/user_notifications?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: { apikey: ANON_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() })
    });
    if (response.ok) await load();
  }

  async function markAllRead() {
    const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
    if (!session?.access_token) return;
    const response = await fetch(SUPABASE_URL + "/rest/v1/user_notifications?read_at=is.null", {
      method: "PATCH",
      headers: { apikey: ANON_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() })
    });
    if (response.ok) await load();
  }

  const unread = items.filter(item => !item.read_at).length;
  return <div style={{ position: "relative", display: "inline-flex" }}>
    <button type="button" onClick={() => { setOpen(value => !value); if (!open) void load(); }}
      aria-label={unread ? unread + " unread notifications" : "Notifications"}
      style={{ position: "relative", border: "1px solid #DCE8F1", borderRadius: 9, background: "#fff", color: "#071B31", padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>
      🔔 Notifications
      {unread > 0 && <span style={{ marginLeft: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 19, height: 19, borderRadius: 20, background: "#D33B36", color: "#fff", fontSize: 11 }}>{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <section style={{ position: "absolute", zIndex: 50, right: 0, top: "calc(100% + 8px)", width: "min(360px, calc(100vw - 32px))", maxHeight: 440, overflowY: "auto", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 12, boxShadow: "0 12px 36px #071b3120", padding: 14, color: "#071B31" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong>Notifications</strong>
        <button type="button" onClick={() => void markAllRead()} disabled={!unread} style={{ border: 0, background: "transparent", color: "#0788BD", cursor: unread ? "pointer" : "default", fontSize: 12 }}>Mark all read</button>
      </div>
      {error && <p role="status" style={{ color: "#A33", fontSize: 12 }}>{error}</p>}
      {!items.length && !error && <p style={{ color: "#60758A", fontSize: 13, padding: "18px 0" }}>You're all caught up. New account and search updates will appear here.</p>}
      {items.map(item => <article key={item.id} style={{ padding: "12px 2px", borderBottom: "1px solid #EDF2F6", background: item.read_at ? "#fff" : "#F5FAFD" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ fontSize: 13 }}>{item.title}</strong>
          {!item.read_at && <span style={{ width: 7, height: 7, borderRadius: 8, background: "#079BD3", marginTop: 5, flexShrink: 0 }} />}
        </div>
        <p style={{ margin: "5px 0", fontSize: 12, lineHeight: 1.5, color: "#40566B" }}>{item.message}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <time style={{ fontSize: 10, color: "#71869A" }}>{new Date(item.created_at).toLocaleString("en-ZA")}</time>
          {item.action_url && <a href={item.action_url} style={{ color: "#0788BD", fontSize: 11, fontWeight: 700 }}>View</a>}
          {!item.read_at && <button type="button" onClick={() => void markRead(item.id)} style={{ border: 0, background: "transparent", color: "#0788BD", cursor: "pointer", fontSize: 11 }}>Mark read</button>}
        </div>
      </article>)}
    </section>}
  </div>;
}
