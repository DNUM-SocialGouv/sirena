/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MATOMO_URL: string;
  readonly VITE_MATOMO_SITE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
