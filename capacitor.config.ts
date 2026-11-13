import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'za.co.ekhaya.pricechecker',
  appName: 'Ekhaya Price Checker',
  webDir: 'mobile-dist',
  android: { allowMixedContent: false },
};

export default config;
