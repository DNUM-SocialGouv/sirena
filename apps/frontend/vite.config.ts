import { sentryVitePlugin } from "@sentry/vite-plugin";
import { URL, fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    ...(process.env.SENTRY_ENABLED === 'true' ? 
      [sentryVitePlugin({
        org: "incubateur",
        project: "psn-sirena-frontend",
        release: { name: process.env.APP_VERSION ?? 'unknown' },
        authToken: process.env.SENTRY_AUTH_TOKEN,
        url: "https://sentry2.fabrique.social.gouv.fr/"
      })] : [])
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  build: {
    sourcemap: true
  }
});
