import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "HOME", key: "home" },
  { href: "/services/", label: "OUR SERVICES", key: "services" },
  { href: "/pricing/", label: "PLANS & PRICING", key: "pricing" },
  { href: "/marketplaces/", label: "MARKETPLACE CONNECTIONS", key: "marketplaces" },
  { href: "/price-checker/", label: "PRICE CHECKER", key: "price-checker" },
  { href: "/download/", label: "DOWNLOAD APP", key: "download" },
  { href: "/account/", label: "MY ACCOUNT", key: "account" },
];

export default function SiteHeader({ active = "" }: { active?: string }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap", borderBottom: "1px solid #DCE8F1", paddingBottom: 18 }}>
      <Link href="/" aria-label="Ekhaya Technologies home" style={{ flex: "0 0 auto" }}>
        <Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies — Digital solutions. Built around you." width={230} height={190} priority style={{ width: 170, height: "auto" }} />
      </Link>
      <nav aria-label="Main navigation" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px 20px", flexWrap: "wrap", flex: "1 1 700px" }}>
        {links.map((link) => <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined} style={{ color: active === link.key ? "#079BD3" : "#60758A", textDecoration: "none", fontSize: 11, fontWeight: 800, letterSpacing: ".035em", whiteSpace: "nowrap" }}>{link.label}</Link>)}
      </nav>
    </header>
  );
}
