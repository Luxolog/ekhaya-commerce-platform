"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
  try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  try {
    document.cookie = COOKIE_KEY + "=" + encodeURIComponent(code) + "; Max-Age=7776000; Path=/; SameSite=Lax; Secure";
  } catch {}
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

export default function EkhayaReferralAttribution() {
  const router = useRouter();

  useEffect(() => {
    // Capture a partner code on the first landing page and retain it for 90 days.
    const params = new URLSearchParams(window.location.search);
    const incoming = cleanCode(params.get("ref") || params.get("referral") || params.get("partner"));
    if (incoming) persistCode(incoming);

    const onDocumentClick = (event: MouseEvent) => {
      // Only take over an ordinary left-click. Preserve new-tab, download and modified clicks.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target as Element | null;
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.dataset.noReferralCarry === "true" || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target.toLowerCase() !== "_self") return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

      const code = currentCode() || incoming;
      if (!code) return;

      let destination: URL;
      try { destination = new URL(rawHref, window.location.href); } catch { return; }

      // Only carry attribution across same-origin web navigation. Reject executable,
      // data and other non-web schemes rather than maintaining a denylist.
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
      if (destination.origin !== window.location.origin || isPrivateRoute(destination.pathname)) return;

      // The previous approach only rewrote the rendered <a href>. Next.js Link can
      // navigate using its original React href, bypassing that DOM mutation.
      // Intercept the click before Next Link and route with the referral in the URL.
      if (!destination.searchParams.has("ref")) destination.searchParams.set("ref", code);
      const nextUrl = destination.pathname + destination.search + destination.hash;
      if (nextUrl === window.location.pathname + window.location.search + window.location.hash) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      router.push(nextUrl);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [router]);

  return null;
}
