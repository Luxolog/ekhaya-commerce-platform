import type { Metadata } from 'next';
import './globals.css';
import EkhayaReferralAttribution from '@/components/EkhayaReferralAttribution';

export const metadata: Metadata = {
  title: 'Ekhaya Price Checker | Ekhaya Technologies',
  description: 'Compare marketplace prices and calculate your selling margins with Ekhaya Technologies.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  applicationName: 'Ekhaya Price Checker',
  themeColor: '#071B31',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-ZA"><body><EkhayaReferralAttribution />{children}</body></html>;
}
