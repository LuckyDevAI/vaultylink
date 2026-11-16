import { CapacitorConfig } from '@capacitor/cli';

// Store build: bundles the web app from dist (no live-reload server URL).
const config: CapacitorConfig = {
  appId: 'com.vaultylink.app',
  appName: 'VaultyLink',
  webDir: 'dist',
};

export default config;
