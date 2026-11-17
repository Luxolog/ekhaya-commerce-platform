import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Download the Ekhaya Price Checker App | Ekhaya Technologies",
  description:
    "Access Ekhaya Price Checker in your browser. The Android app is still undergoing testing and is not yet publicly available.",
};

export default function DownloadPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "24px clamp(20px,6vw,88px) 64px", color: "#071B31", background: "#F4F8FC" }}>
      <SiteHeader active="download" />
      <section style={{ maxWidth: 900, margin: "76px auto 0", textAlign: "center" }}>
        <p style={{ color: "#079BD3", fontSize: 12, letterSpacing: ".18em", fontWeight: 800 }}>
          EKHAYA PRICE CHECKER
        </p>
        <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.08, letterSpacing: "-.045em", margin: "18px 0" }}>
          Your product research starts <span style={{ color: "#079BD3" }}>here.</span>
        </h1>
        <p style={{ color: "#60758A", fontSize: 17, lineHeight: 1.8, maxWidth: 700, margin: "0 auto" }}>
          You can use Ekhaya Price Checker directly in your web browser. Our Android app is still being tested and is not yet available for public download.
        </p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
          <Link href="/price-checker/" style={{ display: "inline-block", padding: "14px 22px", background: "#079BD3", color: "#fff", borderRadius: 9, textDecoration: "none", fontWeight: 800 }}>
            OPEN PRICE CHECKER
          </Link>
          <Link href="/account/" style={{ display: "inline-block", padding: "14px 22px", background: "#fff", color: "#071B31", border: "1px solid #DCE8F1", borderRadius: 9, textDecoration: "none", fontWeight: 800 }}>
            SELLER ACCOUNT
          </Link>
        </div>
        <div style={{ marginTop: 54, padding: "26px clamp(20px,4vw,38px)", background: "#fff", border: "1px solid #DCE8F1", borderRadius: 16, textAlign: "left" }}>
          <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 22, margin: "0 0 10px" }}>About the Android app</h2>
          <p style={{ color: "#60758A", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            An internal Android debug build has been produced, but it has not completed the release, security and real-device testing required for public distribution. We will publish an official download here only after those checks are complete. Please do not install unofficial copies.
          </p>
        </div>
        <p style={{ color: "#60758A", fontSize: 13, marginTop: 26 }}>
          Need help? Contact Ekhaya Technologies through its official published contact details.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
