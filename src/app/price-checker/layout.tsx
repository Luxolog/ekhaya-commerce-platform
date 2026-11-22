import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ekhaya Price Checker",
  applicationName: "Ekhaya Price Checker",
  description: "Check marketplace prices and estimate your product profitability.",
  manifest: "/price-checker/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Price Checker",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/price-checker/app-icon.svg",
    shortcut: "/price-checker/app-icon.svg",
    apple: "/price-checker/app-icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#071B31",
  width: "device-width",
  initialScale: 1
};

export default function PriceCheckerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
