"use client";

import { useEffect } from "react";

const STORAGE_KEY = "ekhaya_referral_code";
const COOKIE_KEY = "ekhaya_referral_code";

function cleanCode(value: string | null) {
  return (value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

function persistCode(code: string) {
  if (!code) return;
  try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  try {
    document.cookie = COOKIE_KEY + "=" + encodeURIComponent(code) + "; Max-Age=7776000; Path=/; SameSite=Lax; Secure";
  } catch {}
}

export default function EkhayaReferralAttribution() {
  useEffect(() => {
    // Capture attribution only when a visitor arrives through a partner link.
    // Keep the code in first-party storage for conversion attribution, but do not
    // append it to internal URLs. Ekhaya's public URLs stay clean and canonical.
    const params = new URLSearchParams(window.location.search);
    const incoming = cleanCode(params.get("ref") || params.get("referral") || params.get("partner"));
    if (incoming) persistCode(incoming);
  }, []);

  return null;
}
