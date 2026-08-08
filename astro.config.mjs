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
        description: 'Create personal ambient scenes for focus and relaxation.',
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
        cleanupOutdatedCaches: true,
        globIgnores: ['sounds/**/*'],
        globPatterns: ['**/*'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        navigateFallback: undefined,
        runtimeCaching: [
          {
            handler: 'CacheFirst',
            options: {
              cacheName: 'miauudio-audio-v1',
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
                maxEntries: 24,
                purgeOnQuotaError: true,
              },
              rangeRequests: true,
            },
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith('/sounds/'),
          },
        ],
      },
    }),
  ],
});
