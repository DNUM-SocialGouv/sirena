import { createRouter } from '@tanstack/react-router';
import { routerFallbackComponents } from '@/lib/routerFallbacks';
import { routeTree } from '@/routeTree.gen';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  ...routerFallbackComponents,
});
