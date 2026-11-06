import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ekhaya Commerce | Store Platform',
  description: 'A store platform built for Ekhaya and independent merchants.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-ZA"><body>{children}</body></html>;
}
