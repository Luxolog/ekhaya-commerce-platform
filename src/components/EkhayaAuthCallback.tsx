"use client";

import { useEffect } from "react";

// Keep Supabase auth callbacks inside the application even when the project
// falls back to its configured Site URL instead of the requested redirect.
export default function EkhayaAuthCallback() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/account")) return;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const hasAuthCallback =
      params.has("access_token") ||
      params.has("error_code") ||
      params.has("error_description") ||
      params.get("type") === "recovery";
    if (!hasAuthCallback) return;
    window.location.replace("/account/" + window.location.search + hash);
  }, []);
  return null;
}
