import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';

const isNativeBuild = process.env.PUBLIC_APP_TARGET === 'native';

export default defineConfig({
  integrations: [
    react(),
    AstroPWA({
      disable: isNativeBuild,
      manifest: {
        background_color: '#09090b',
        description: 'Ambient sounds for focus, rest, and sleep.',
        display: 'standalone',
        icons: [
          ...[72, 128, 144, 152, 192, 256, 512].map(size => ({
            sizes: `${size}x${size}`,
            src: `/assets/pwa/${size}.png`,
            type: 'image/png',
          })),
        ],
        name: 'Miauudio',
        orientation: 'any',
        scope: '/',
        short_name: 'Miauudio',
        start_url: '/',
        theme_color: '#09090b',
      },
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*'],
        maximumFileSizeToCacheInBytes: Number.MAX_SAFE_INTEGER,
        navigateFallback: '/',
      },
    }),
  ],
});
