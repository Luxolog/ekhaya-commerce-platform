"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

type Platform = "ios" | "android" | "firefox-desktop" | "desktop" | "other";

const steps: Record<Platform, { title: string; intro: string; items: string[]; note: string }> = {
  ios: {
    title: "iPhone and iPad",
    intro: "Install Price Checker from Safari. No App Store download is required.",
    items: ["Open Ekhaya Price Checker in Safari.", "Tap the Share icon.", "Choose “Add to Home Screen”.", "Tap “Add” to place the app on your Home Screen."],
    note: "If you are viewing this page in another iPhone browser, open Price Checker in Safari to add it to your Home Screen."
  },
  android: {
    title: "Android phones and tablets",
    intro: "Use Chrome for the smoothest installation experience.",
    items: ["Open Ekhaya Price Checker in Chrome.", "Tap “Install app” if the prompt appears, or open the three-dot menu.", "Choose “Install app” or “Add to Home screen”.", "Confirm the installation."],
    note: "Firefox for Android may also offer an Install or Add to Home screen option. The wording depends on your browser version."
  },
  "firefox-desktop": {
    title: "Firefox on desktop",
    intro: "Firefox desktop does not currently offer the same standard PWA installation flow as Chrome and Edge.",
    items: ["Copy or open the Price Checker address in Chrome or Microsoft Edge.", "Use the install icon in the address bar, or open the browser menu.", "Choose “Install Ekhaya Price Checker”.", "Confirm the installation."],
    note: "You can continue using Price Checker in Firefox without installing it."
  },
  desktop: {
    title: "Windows, Mac and Linux",
    intro: "Install Price Checker as a desktop app using Chrome or Microsoft Edge.",
    items: ["Open Price Checker in Chrome or Microsoft Edge.", "Select the install icon in the address bar, if shown, or open the browser menu.", "Choose “Install Ekhaya Price Checker” or “Install page as app”.", "Confirm the installation."],
    note: "The app opens in its own window and can be launched from your device's app list."
  },
  other: {
    title: "Install on your device",
    intro: "Ekhaya Price Checker is a Progressive Web App (PWA). Installation is available through supported browsers.",
    items: ["Open Price Checker in your browser.", "Look for an Install option in the browser menu or address bar.", "Follow the browser's installation prompt."],
    note: "For iPhone and iPad, use Safari and choose Share → Add to Home Screen."
  }
};

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) setPlatform("ios");
    else if (/Android/i.test(ua)) setPlatform("android");
    else if (/Firefox/i.test(ua)) setPlatform("firefox-desktop");
    else if (/Windows|Macintosh|Linux/i.test(ua)) setPlatform("desktop");
  }, []);

  const guide = steps[platform];

  return (
    <main style={{ minHeight: "100vh", background: "#F4F8FC", color: "#071B31", padding: "28px clamp(20px,6vw,88px) 72px" }}>
      <SiteHeader active="download" />
      <section style={{ maxWidth: 980, padding: "clamp(58px,9vw,105px) 0 42px" }}>
        <p style={{ color: "#079BD3", fontWeight: 800, letterSpacing: ".18em", fontSize: 12 }}>EKHAYA PRICE CHECKER · APP INSTALLATION</p>
        <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(42px,7vw,78px)", lineHeight: 1.04, fontWeight: 800, letterSpacing: "-.055em", margin: "18px 0 22px", maxWidth: 900 }}>Take your price checker with you.</h1>
        <p style={{ color: "#60758A", fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.75, maxWidth: 720 }}>Install Ekhaya Price Checker on your phone, tablet or computer for quick access while you source stock. Search products, estimate marketplace fees and understand potential margins.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
          <Link href="/price-checker/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "15px 23px", background: "#079BD3", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: ".04em" }}>OPEN PRICE CHECKER TO INSTALL →</Link>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "14px 17px", border: "1px solid #DCE8F1", background: "#fff", borderRadius: 8, color: "#60758A", fontSize: 11, fontWeight: 800 }}>NO APP STORE REQUIRED</span>
        </div>
      </section>

      <section style={{ maxWidth: 980, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { icon: "📱", title: "Android", detail: "Install using Chrome or a supported Android browser." },
          { icon: "", title: "iPhone & iPad", detail: "Add Price Checker to your Home Screen using Safari." },
          { icon: "💻", title: "Desktop", detail: "Install from Chrome or Microsoft Edge." }
        ].map(card => <article key={card.title} style={{ background: "#fff", border: "1px solid #DCE8F1", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 26, marginBottom: 12 }}>{card.icon}</div>
          <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 19, margin: "0 0 8px" }}>{card.title}</h2>
          <p style={{ color: "#60758A", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{card.detail}</p>
        </article>)}
      </section>

      <section style={{ maxWidth: 980, background: "#fff", border: "1px solid #DCE8F1", borderRadius: 16, padding: "clamp(22px,4vw,34px)" }}>
        <p style={{ color: "#079BD3", fontSize: 10, fontWeight: 800, letterSpacing: ".16em", margin: "0 0 10px" }}>INSTALLATION GUIDE</p>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 26, margin: "0 0 10px" }}>{guide.title}</h2>
        <p style={{ color: "#60758A", fontSize: 14, lineHeight: 1.7, margin: "0 0 18px" }}>{guide.intro}</p>
        <ol style={{ paddingLeft: 22, margin: 0, color: "#304B63", fontSize: 14, lineHeight: 2.1 }}>
          {guide.items.map((item, index) => <li key={index}>{item}</li>)}
        </ol>
        <p style={{ margin: "18px 0 0", padding: 14, background: "#F4F8FC", borderRadius: 8, color: "#60758A", fontSize: 12, lineHeight: 1.7 }}>{guide.note}</p>
      </section>

      <section style={{ maxWidth: 980, marginTop: 20, background: "#071B31", color: "#fff", borderRadius: 16, padding: "clamp(24px,4vw,36px)" }}>
        <p style={{ color: "#00A9E8", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>ABOUT THIS DOWNLOAD</p>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 24, margin: "10px 0" }}>Install directly from the browser.</h2>
        <p style={{ color: "#D4E2EC", fontSize: 13, lineHeight: 1.8, maxWidth: 760, margin: 0 }}>This release is a Progressive Web App (PWA), not an APK file or an App Store listing. It installs through supported browsers and receives updates from the live Price Checker website. A separately packaged Android APK is a future release and is not available to download yet.</p>
        <Link href="/price-checker/" style={{ display: "inline-flex", marginTop: 22, padding: "13px 18px", background: "#079BD3", color: "#fff", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>GO TO EKHAYA PRICE CHECKER →</Link>
      </section>
      <footer style={{ maxWidth: 980, marginTop: 54, paddingTop: 20, borderTop: "1px solid #DCE8F1", color: "#60758A", fontSize: 12 }}>Ekhaya Technologies · The Ekhaya Price Checker app experience.</footer>
    </main>
  );
}
