import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ekhaya Price Checker | Ekhaya Technologies',
  description: 'Compare marketplace prices and calculate your selling margins with Ekhaya Price Checker.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  applicationName: 'Ekhaya Price Checker',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#071B31',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-ZA"><body>{children}</body></html>;
}
