import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'za.co.ekhaya.technologies.pricechecker',
  appName: 'Ekhaya Price Checker',
  webDir: 'out',
  server: {
    // The native wrapper must open Price Checker only, not the Ekhaya marketing site.
    // Override this public URL only when building against an approved test environment.
    url: process.env.PRICE_CHECKER_APP_URL ?? 'https://pricechecker.ekhayatech.co.za/price-checker/',
    cleartext: false,
    allowNavigation: ['pricechecker.ekhayatech.co.za'],
  },
  android: { allowMixedContent: false },
};

export default config;
