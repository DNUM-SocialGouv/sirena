import { sentryVitePlugin } from "@sentry/vite-plugin";
import { URL, fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Keep in sync with apps/frontend/docker-entrypoint.sh
const RUNTIME_ENV_KEYS = [
  'IS_LOGGED_TOKEN_NAME',
  'SENTRY_ENABLED',
  'SENTRY_DSN_FRONTEND',
  'APP_ENV',
  'MATOMO_URL',
  'MATOMO_SITE_ID',
] as const;

function devRuntimeEnvPlugin(): Plugin {
  return {
    name: 'dev-runtime-env',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/env.js', (_req, res) => {
        const payload = Object.fromEntries(
          RUNTIME_ENV_KEYS.map((key) => [key, process.env[key] ?? '']),
        );
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.end(`window.__ENV__ = ${JSON.stringify(payload)};`);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devRuntimeEnvPlugin(),
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

  css: {
    lightningcss: {
      errorRecovery: true,
    },
  },

  build: {
    sourcemap: true,
  }
});
