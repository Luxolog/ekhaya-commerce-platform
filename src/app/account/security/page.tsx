"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
type Session = { access_token: string };

export default function AccountSecurityPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function request(accessToken: string, payload: Record<string, unknown>) {
    const response = await fetch(URL + "/functions/v1/partner-admin-email-otp", {
      method: "POST",
      headers: { apikey: KEY, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Security settings could not be updated.");
    return body;
  }

  useEffect(() => {
    let active = true;
    try {
      const raw = localStorage.getItem("ekhaya_session");
      const current = raw ? JSON.parse(raw) : null;
      if (!current?.access_token) {
        window.location.replace("/account/?account=partner");
        return;
      }
      setSession(current);
      request(current.access_token, { action: "status" }).then((result) => {
        if (!active) return;
        setEnabled(result.enabled === true);
        setEmail(String(result.email ?? ""));
      }).catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load security settings.");
      }).finally(() => { if (active) setLoading(false); });
    } catch {
      window.location.replace("/account/?account=partner");
    }
    return () => { active = false; };
  }, []);

  async function enableProtection() {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      const result = await request(session.access_token, { action: "update", enabled: true, password });
      setEnabled(result.enabled === true);
      setPassword("");
      setMessage("Email OTP protection is now enabled. It will be required on your next Partner or Admin sign-in.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not enable email OTP."); }
    finally { setBusy(false); }
  }

  async function startDisable() {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      const result = await request(session.access_token, { action: "start" });
      setChallengeStarted(true);
      setMessage("A confirmation code has been sent to " + String(result.email_hint ?? email) + ".");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send the confirmation code."); }
    finally { setBusy(false); }
  }

  async function confirmDisable() {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      await request(session.access_token, { action: "verify", code });
      const result = await request(session.access_token, { action: "update", enabled: false, password });
      setEnabled(result.enabled === true);
      setPassword(""); setCode(""); setChallengeStarted(false);
      setMessage("Email OTP protection has been disabled for this account.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not disable email OTP."); }
    finally { setBusy(false); }
  }

  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 13, border: "1px solid #DCE8F1", borderRadius: 8, marginTop: 10, fontSize: 14 };
  const button: React.CSSProperties = { width: "100%", padding: 13, background: "#079BD3", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 12 };

  return <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "32px 16px", fontFamily: "Arial,sans-serif" }}>
    <section style={{ maxWidth: 620, margin: "40px auto", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 28 }}>
      <Link href="/account/" style={{ color: "#079BD3", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← ACCOUNT ACCESS</Link>
      <p style={{ color: "#079BD3", fontSize: 10, fontWeight: 800, letterSpacing: 2, marginTop: 26 }}>ACCOUNT SECURITY</p>
      <h1 style={{ fontSize: 28, margin: "8px 0" }}>Email verification</h1>
      <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.7 }}>Add a second verification step to your Partner or Admin account. When enabled, Ekhaya sends a one-time six-digit code to your registered email after your password is accepted.</p>
      {loading ? <p>Loading your security settings…</p> : <>
        <div style={{ background: "#F4F8FC", border: "1px solid #DCE8F1", borderRadius: 10, padding: 16, margin: "18px 0" }}>
          <div style={{ fontSize: 11, color: "#60758A", fontWeight: 700, letterSpacing: 1 }}>REGISTERED EMAIL</div>
          <strong>{email || "Not available"}</strong>
          <div style={{ marginTop: 12, fontSize: 13 }}><strong>Protection status:</strong> {enabled ? "Enabled" : "Disabled"}</div>
        </div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 18 }}>Current password (required to change this setting)</label>
        <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your current password" style={field} />
        {!enabled && <button disabled={busy || password.length < 8} onClick={enableProtection} style={button}>{busy ? "Please wait…" : "Enable email OTP"}</button>}
        {enabled && !challengeStarted && <button disabled={busy || password.length < 8} onClick={startDisable} style={{ ...button, background: "#8B3A3A" }}>{busy ? "Please wait…" : "Disable email OTP"}</button>}
        {enabled && challengeStarted && <>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 18 }}>Email confirmation code</label>
          <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Six-digit code" style={field} />
          <button disabled={busy || password.length < 8 || code.length !== 6} onClick={confirmDisable} style={{ ...button, background: "#8B3A3A" }}>{busy ? "Verifying…" : "Confirm and disable protection"}</button>
        </>}
      </>}
      {message && <p role="status" style={{ background: "#F4F8FC", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#304B63" }}>{message}</p>}
      <p style={{ fontSize: 11, color: "#71869A", lineHeight: 1.6, marginTop: 18 }}>Codes expire after five minutes and are limited to five attempts. Disabling protection requires your password and confirmation through your registered email.</p>
    </section>
  </main>;
}
