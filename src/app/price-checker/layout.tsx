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
    icon: [
      { url: "/price-checker/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/price-checker/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/price-checker/icon-192.png",
    apple: [{ url: "/price-checker/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
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
