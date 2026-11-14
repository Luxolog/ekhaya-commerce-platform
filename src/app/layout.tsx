import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ekhaya Technologies | Digital Commerce & Business Solutions',
  description: 'Ekhaya Technologies builds digital commerce platforms, marketplace tools and custom business solutions. Explore what is available today and what is coming next.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  applicationName: 'Ekhaya Technologies',
  themeColor: '#071B31',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-ZA"><body>{children}</body></html>;
}
