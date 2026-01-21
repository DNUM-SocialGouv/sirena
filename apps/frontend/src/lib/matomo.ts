import { router } from '@/lib/router';

declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

const MATOMO_URL = import.meta.env.VITE_MATOMO_URL;
const MATOMO_SITE_ID = import.meta.env.VITE_MATOMO_SITE_ID;

function isMatomoEnabled(): boolean {
  return Boolean(MATOMO_URL && MATOMO_SITE_ID);
}

function initMatomoScript(): void {
  if (!isMatomoEnabled()) {
    return;
  }

  window._paq = window._paq || [];
  window._paq.push(['trackPageView']);
  window._paq.push(['enableLinkTracking']);

  const script = document.createElement('script');
  script.async = true;
  script.src = `${MATOMO_URL}/matomo.js`;

  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);

  window._paq.push(['setTrackerUrl', `${MATOMO_URL}/matomo.php`]);
  window._paq.push(['setSiteId', MATOMO_SITE_ID]);
}

function trackPageView(url: string): void {
  if (!isMatomoEnabled() || !window._paq) {
    return;
  }

  window._paq.push(['setCustomUrl', url]);
  window._paq.push(['trackPageView']);
}

function subscribeToRouteChanges(): void {
  if (!isMatomoEnabled()) {
    return;
  }

  router.subscribe('onResolved', ({ toLocation }) => {
    trackPageView(toLocation.href);
  });
}

export function initMatomo(): void {
  initMatomoScript();
  subscribeToRouteChanges();
}
