import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/price-checker/",
    name: "Ekhaya Price Checker",
    short_name: "Price Checker",
    description: "Check marketplace prices and estimate your product profitability.",
    start_url: "/price-checker/",
    scope: "/price-checker/",
    display: "standalone",
    display_override: ["standalone"],
    background_color: "#F4F8FC",
    theme_color: "#071B31",
    orientation: "portrait",
    icons: [
      { src: "/price-checker/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ]
  };
}
