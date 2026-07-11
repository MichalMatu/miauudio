import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.michalmatu.miauudio',
  appName: 'Miauudio',
  plugins: {
    SystemBars: {
      hidden: false,
      insetsHandling: 'css',
      style: 'DARK',
    },
  },
  webDir: 'dist',
};

export default config;
