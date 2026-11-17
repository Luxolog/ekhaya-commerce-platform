import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ekhaya Support Desk",
  description: "Unified customer support and communications by Ekhaya Technologies."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
