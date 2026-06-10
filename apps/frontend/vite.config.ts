import { sentryVitePlugin } from "@sentry/vite-plugin";
import { URL, fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
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

// Defer heavy non-critical stylesheets (DSFR ≈ 900KB) so they no longer block first paint.
// Uses the classic `media="print" onload="this.media='all'"` swap pattern.
function asyncCssPlugin(matchers: RegExp[]): Plugin {
  return {
    name: 'async-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link\s+([^>]*?)rel="stylesheet"([^>]*?)>/g,
        (match, before: string, after: string) => {
          const hrefMatch = match.match(/href="([^"]+)"/);
          if (!hrefMatch) return match;
          const href = hrefMatch[1];
          if (!matchers.some((re) => re.test(href))) return match;
          const attrs = `${before}${after}`.replace(/\s+/g, ' ').trim();
          return [
            `<link ${attrs} rel="stylesheet" media="print" onload="this.media='all'">`,
            `<noscript><link ${attrs} rel="stylesheet"></noscript>`,
          ].join('\n    ');
        },
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devRuntimeEnvPlugin(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    asyncCssPlugin([/vendor-dsfr.*\.css$/]),
    ...(process.env.SENTRY_ENABLED === 'true' ?
      [sentryVitePlugin({
        org: "incubateur",
        project: "psn-sirena-frontend",
        release: { name: process.env.APP_VERSION ?? 'unknown' },
        authToken: process.env.SENTRY_AUTH_TOKEN,
        url: "https://sentry2.fabrique.social.gouv.fr/"
      })] : []),
    ...(process.env.ANALYZE_BUNDLE === 'true'
      ? [
          visualizer({
            filename: './dist/bundle-stats.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }) as Plugin,
        ]
      : []),
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
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Match by the *final* `/node_modules/<pkg>/` segment so that e.g.
          // @sentry/react and @base-ui/react don't get caught by a naive "/react/" test.
          const pkgMatch = id.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//g);
          if (!pkgMatch) return;
          const last = pkgMatch[pkgMatch.length - 1];
          const pkg = last.replace(/^\/node_modules\//, '').replace(/\/$/, '');

          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
            return 'vendor-react';
          }
          if (
            pkg.startsWith('@tanstack/react-router') ||
            pkg.startsWith('@tanstack/router-') ||
            pkg.startsWith('@tanstack/history') ||
            pkg.startsWith('@tanstack/store') ||
            pkg.startsWith('@tanstack/react-store')
          ) {
            return 'vendor-router';
          }
          if (pkg.startsWith('@tanstack/react-query') || pkg.startsWith('@tanstack/query-')) {
            return 'vendor-query';
          }
          if (pkg.startsWith('@codegouvfr/react-dsfr')) {
            // react-dsfr loads its core runtime via a dynamic import at startup
            // (start.js → `await import("./dsfr/dsfr.module")`), which mutates
            // `window.dsfr`. Keep that file as its own chunk so the side-effect
            // runs AFTER window.dsfr has been initialized — otherwise
            // `window.dsfr.start is not a function` at boot.
            if (id.includes('react-dsfr/dsfr/dsfr.module')) return;
            return 'vendor-dsfr';
          }
          if (pkg.startsWith('@sentry/') || pkg.startsWith('@sentry-internal/')) {
            return 'vendor-sentry';
          }
          if (pkg === 'zod') return 'vendor-zod';
          if (pkg.startsWith('@base-ui/') || pkg.startsWith('@floating-ui/')) {
            return 'vendor-ui-primitives';
          }
        },
      },
    },
  },
});
