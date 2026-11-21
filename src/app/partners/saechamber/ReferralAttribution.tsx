"use client";

import { useEffect } from "react";

export default function ReferralAttribution() {
  useEffect(() => {
    try {
      localStorage.setItem("ekhaya_referral_code", "SAECHAMBER");
    } catch {
      // Registration links on this page also carry the partner code directly.
    }
  }, []);
  return null;
}
