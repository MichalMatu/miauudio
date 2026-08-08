import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.michalmatu.miauudio',
  appName: 'Miauudio',
  plugins: {
    // MainActivity re-shows the nav bar after Capacitor hides all system bars.
    SystemBars: {
      hidden: true,
      insetsHandling: 'disable',
      style: 'DARK',
    },
  },
  webDir: 'dist',
};

export default config;
