import Image from "next/image";
import Link from "next/link";

const actionsUrl = "https://github.com/Luxolog/ekhaya-commerce-platform/actions/workflows/android-apk.yml";

export default function DownloadPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--pale)", color: "var(--navy)", padding: "28px clamp(20px, 6vw, 88px) 72px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, borderBottom: "1px solid var(--line)", paddingBottom: 20 }}>
        <Link href="/" aria-label="Ekhaya Technologies home"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={230} height={190} priority style={{ width: 170, height: "auto" }} /></Link>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", fontSize: 12, fontWeight: 800 }}>
          <Link href="/pricing/" style={{ color: "var(--muted)", textDecoration: "none" }}>PLANS & PRICING</Link>
          <Link href="/marketplaces/" style={{ color: "var(--muted)", textDecoration: "none" }}>MARKETPLACE CONNECTIONS</Link>
          <Link href="/download/" style={{ color: "var(--blue)", textDecoration: "none" }}>DOWNLOAD APP</Link>
        </nav>
      </header>
      <section style={{ maxWidth: 850, padding: "clamp(58px, 9vw, 110px) 0 50px" }}>
        <p style={{ color: "var(--blue)", fontWeight: 800, letterSpacing: ".18em", fontSize: 12 }}>EKHAYA PRICE CHECKER · ANDROID</p>
        <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(40px, 7vw, 76px)", lineHeight: 1.04, fontWeight: 800, letterSpacing: "-.055em", margin: "18px 0 22px" }}>Take your price checker with you.</h1>
        <p style={{ color: "var(--muted)", fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.75, maxWidth: 680 }}>Use Ekhaya Price Checker on your Android device to calculate selling prices, estimate marketplace fees and understand your potential margins while you source stock.</p>
      </section>
      <section style={{ maxWidth: 850, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
        <article style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: 26 }}>
          <p style={{ color: "var(--blue)", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}>ANDROID APP</p>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, margin: "10px 0" }}>Early-access test build</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>The Android APK is being prepared for device testing. The current test build packages the calculator and app shell; live marketplace lookups are still handled by the hosted service as those integrations become available.</p>
          <a href={actionsUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", marginTop: 12, padding: "13px 18px", borderRadius: 8, background: "var(--blue)", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 800 }}>VIEW ANDROID BUILD →</a>
          <p style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.6, marginTop: 14 }}>When the build completes, open the latest successful run and download the <strong>ekhaya-price-checker-debug-apk</strong> artifact. GitHub may require you to sign in to download workflow artifacts.</p>
        </article>
        <article style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: 26 }}>
          <p style={{ color: "var(--blue)", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}>COMING NEXT</p>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, margin: "10px 0" }}>Public app release</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>We&apos;re preparing a signed Android release so users can install the app directly from this website. The public download will be published here after device testing and release checks.</p>
          <span style={{ display: "inline-block", marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "var(--pale)", color: "var(--navy)", fontSize: 11, fontWeight: 800 }}>PUBLIC APK · COMING SOON</span>
        </article>
      </section>
      <footer style={{ maxWidth: 850, marginTop: 60, paddingTop: 20, borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 12 }}>Ekhaya Technologies · Built for South African resellers · <Link href="/" style={{ color: "var(--blue)" }}>Back to home</Link></footer>
    </main>
  );
}
