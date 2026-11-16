import Link from "next/link";

export default function SiteFooter() {
  return <footer style={{ maxWidth: 1200, margin: "48px auto 0", paddingTop: 18, borderTop: "1px solid #DCE8F1", color: "#60758A", fontSize: 12, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
    <span>© {new Date().getFullYear()} Ekhaya Technologies</span>
    <nav aria-label="Legal links" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link href="/privacy/" style={{ color: "#0786B7", textDecoration: "none" }}>Privacy Notice</Link>
      <a href="mailto:support@ekhayatech.co.za" style={{ color: "#0786B7", textDecoration: "none" }}>Contact</a>
    </nav>
  </footer>;
}