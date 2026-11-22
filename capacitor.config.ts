import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'za.co.ekhaya.technologies.pricechecker',
  appName: 'Ekhaya Price Checker',
  webDir: 'out',
  server: {
    // Native app opens Price Checker only; marketing pages and account portals are not its home screen.
    url: process.env.PRICE_CHECKER_APP_URL ?? 'https://pricechecker.ekhayatech.co.za/price-checker/',
    cleartext: false,
    allowNavigation: ['pricechecker.ekhayatech.co.za'],
  },
  android: { allowMixedContent: false },
};

export default config;
