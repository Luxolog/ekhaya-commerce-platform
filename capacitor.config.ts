import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.za.ekhaya.pricechecker",
  appName: "Ekhaya Price Checker",
  webDir: "android-web",
  server: {
    // Android emulator reaches the development computer at 10.0.2.2.
    // For a physical phone, set CAPACITOR_SERVER_URL to the computer's LAN URL.
    url: process.env.CAPACITOR_SERVER_URL || "http://10.0.2.2:3000",
    cleartext: true,
    androidScheme: "http",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
