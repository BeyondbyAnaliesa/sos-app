import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.getsos.sos',
  appName: 'SOS',
  webDir: 'capacitor-shell',
  appendUserAgent: 'SOSNativeIOS',
  server: {
    url: 'https://app.getsos.app',
    cleartext: false,
  },
};

export default config;
