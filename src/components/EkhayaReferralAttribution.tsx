"use client";

import { useEffect } from "react";

const STORAGE_KEY = "ekhaya_referral_code";
const COOKIE_KEY = "ekhaya_referral_code";

function cleanCode(value: string | null) {
  return (value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

function readCookie() {
  try {
    const item = document.cookie.split("; ").find((part) => part.startsWith(COOKIE_KEY + "="));
    return item ? decodeURIComponent(item.slice(COOKIE_KEY.length + 1)) : "";
  } catch {
    return "";
  }
}

function persistCode(code: string) {
  if (!code) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Continue with the first-party cookie if localStorage is unavailable.
  }
  try {
    document.cookie = COOKIE_KEY + "=" + encodeURIComponent(code) + "; Max-Age=7776000; Path=/; SameSite=Lax; Secure";
  } catch {
    // Referral can still be carried in the URL.
  }
}

function currentCode() {
  try {
    return cleanCode(localStorage.getItem(STORAGE_KEY)) || cleanCode(readCookie());
  } catch {
    return cleanCode(readCookie());
  }
}

function isPrivateRoute(pathname: string) {
  return /^\/(partner|admin|owner)(\/|$)/i.test(pathname);
}

function carryReferralToLink(anchor: HTMLAnchorElement, code: string) {
  if (!code || anchor.dataset.noReferralCarry === "true") return;
  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) return;
  try {
    const target = new URL(rawHref, window.location.origin);
    if (target.origin !== window.location.origin || isPrivateRoute(target.pathname)) return;
    if (!target.searchParams.has("ref")) {
      target.searchParams.set("ref", code);
      anchor.setAttribute("href", target.pathname + target.search + target.hash);
    }
  } catch {
    // Ignore malformed or non-navigation hrefs.
  }
}

export default function EkhayaReferralAttribution() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = cleanCode(params.get("ref") || params.get("referral") || params.get("partner"));
    if (incoming) persistCode(incoming);

    // A cookie provides a first-party fallback if localStorage is cleared or unavailable.
    const code = incoming || currentCode();
    if (!code) return;
    persistCode(code);

    const updateLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => carryReferralToLink(anchor, code));
    };
    updateLinks();

    // Re-apply attribution to links rendered later by client-side navigation/components.
    const observer = new MutationObserver(updateLinks);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Ensure the latest code is carried at the moment a visitor clicks a link.
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (anchor) carryReferralToLink(anchor, currentCode() || code);
    };
    document.addEventListener("click", handleClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
