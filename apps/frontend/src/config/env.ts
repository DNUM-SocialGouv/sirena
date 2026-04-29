interface RuntimeEnv {
  IS_LOGGED_TOKEN_NAME: string;
  SENTRY_ENABLED: string;
  SENTRY_DSN_FRONTEND: string;
  APP_ENV: string;
  MATOMO_URL: string;
  MATOMO_SITE_ID: string;
}

declare global {
  interface Window {
    __ENV__?: Partial<RuntimeEnv>;
  }
}

function getEnv<K extends keyof RuntimeEnv>(key: K, fallback?: string): string {
  return window.__ENV__?.[key] ?? import.meta.env[`VITE_${key}`] ?? fallback ?? '';
}

export const env = {
  IS_LOGGED_TOKEN_NAME: getEnv('IS_LOGGED_TOKEN_NAME'),
  SENTRY_ENABLED: getEnv('SENTRY_ENABLED'),
  SENTRY_DSN_FRONTEND: getEnv('SENTRY_DSN_FRONTEND'),
  APP_ENV: getEnv('APP_ENV'),
  MATOMO_URL: getEnv('MATOMO_URL'),
  MATOMO_SITE_ID: getEnv('MATOMO_SITE_ID'),
} as const;
