import SiteHeader from '@/components/SiteHeader';
import Link from "next/link";

export default function DownloadPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--pale)", color: "var(--navy)", padding: "28px clamp(20px, 6vw, 88px) 72px" }}>
      <SiteHeader active="download" />
      <section style={{ maxWidth: 850, padding: "clamp(58px, 9vw, 110px) 0 50px" }}>
        <p style={{ color: "var(--blue)", fontWeight: 800, letterSpacing: ".18em", fontSize: 12 }}>EKHAYA PRICE CHECKER · ANDROID</p>
        <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(40px, 7vw, 76px)", lineHeight: 1.04, fontWeight: 800, letterSpacing: "-.055em", margin: "18px 0 22px" }}>A separate app. The same seller account.</h1>
        <p style={{ color: "var(--muted)", fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.75, maxWidth: 680 }}>Ekhaya Price Checker is being built as its own Android application, separate from the Ekhaya Technologies website. Sign in with the same account you use on the web and continue comparing products on your phone.</p>
      </section>
      <section style={{ maxWidth: 850 }}>
        <article style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "clamp(26px, 5vw, 42px)" }}>
          <p style={{ color: "var(--blue)", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}>ANDROID TEST BUILD</p>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 28, margin: "10px 0 12px" }}>Installation link will appear here after testing</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, maxWidth: 650 }}>The standalone app is being prepared with its own launch screen, icon, Appwrite sign-in and barcode scanning. We will publish an APK here after the Android build and device checks pass.</p>
          <Link href="/price-checker/" style={{ display: "inline-block", marginTop: 16, padding: "13px 17px", borderRadius: 8, background: "var(--blue)", color: "#fff", fontSize: 11, fontWeight: 800 }}>USE PRICE CHECKER ON THE WEB →</Link>
        </article>
      </section>
      <footer style={{ maxWidth: 850, marginTop: 60, paddingTop: 20, borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 12 }}>Ekhaya Technologies · Built for South African resellers · <Link href="/" style={{ color: "var(--blue)" }}>Back to home</Link></footer>
    </main>
  );
}
