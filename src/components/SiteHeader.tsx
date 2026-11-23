import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "HOME", key: "home" },
  { href: "/services/", label: "OUR SERVICES", key: "services" },
  { href: "/pricing/", label: "PLANS & PRICING", key: "pricing" },
  { href: "/price-checker/", label: "PRICE CHECKER", key: "price-checker" },
  { href: "/business-growth-network/", label: "FUNDING PARTNERS", key: "business-growth-network" },
  { href: "/affiliates-partnerships/", label: "AFFILIATES & PARTNERSHIPS", key: "affiliates-partnerships" },
  { href: "/download/", label: "DOWNLOAD APP", key: "download" },
  { href: "/account/", label: "MY ACCOUNT", key: "account" },
];

export default function SiteHeader({ active = "" }: { active?: string }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/" aria-label="Ekhaya Technologies home" style={{ flex: "0 0 auto" }}>
        <Image src="/Ekhaya%20Technologies%20Logo.png" alt="Ekhaya Technologies — Digital solutions. Built around you." width={1381} height={1139} priority style={{ width: 170, height: "auto" }} />
      </Link>
      <nav aria-label="Main navigation" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px 20px", flexWrap: "wrap", flex: "1 1 700px" }}>
        {links.filter((link) => link.key !== "account").map((link) => <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined} style={{ color: active === link.key ? "#079BD3" : "#60758A", textDecoration: "none", fontSize: 11, fontWeight: 800, letterSpacing: ".035em", whiteSpace: "nowrap" }}>{link.label}</Link>)}
        <details style={{ position: "relative" }}>
          <summary style={{ color: active === "account" || active === "partner-account" || active === "admin-account" ? "#079BD3" : "#60758A", cursor: "pointer", listStyle: "none", textDecoration: "none", fontSize: 11, fontWeight: 800, letterSpacing: ".035em", whiteSpace: "nowrap" }}>MY ACCOUNT ▾</summary>
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 12px)", zIndex: 30, minWidth: 190, padding: 8, display: "grid", gap: 2, background: "#fff", border: "1px solid #DCE8F1", borderRadius: 10, boxShadow: "0 12px 30px rgba(7,27,49,.14)" }}>
            <Link href="/account/" style={{ color: "#60758A", padding: "10px 12px", textDecoration: "none", fontSize: 11, fontWeight: 800 }}>MY ACCOUNT</Link>
            <Link href="/partner/account/" style={{ color: "#60758A", padding: "10px 12px", textDecoration: "none", fontSize: 11, fontWeight: 800 }}>PARTNER LOGIN</Link>
            <Link href="/admin/account/" style={{ color: "#60758A", padding: "10px 12px", textDecoration: "none", fontSize: 11, fontWeight: 800 }}>ADMIN LOGIN</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
