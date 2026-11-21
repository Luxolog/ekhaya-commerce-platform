"use client";

import { useEffect } from "react";

const STORAGE_KEY = "ekhaya_referral_code";

export default function EkhayaReferralAttribution() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const incoming = (params.get("ref") || params.get("referral") || params.get("partner") || "").trim();
      const code = incoming.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
      if (code) {
        // A new explicit partner link replaces the previous attribution.
        // Ordinary navigation has no referral parameter and therefore keeps it.
        localStorage.setItem(STORAGE_KEY, code);
      }
    } catch {
      // Attribution is best-effort when browser storage is unavailable.
    }
  }, []);

  return null;
}
