import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { GlobalLayout } from '@/components/layout/globalLayout';

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    );

export const Route = createRootRouteWithContext()({
  component: () => (
    <>
      <HeadContent />
      <GlobalLayout>
        <Outlet />
      </GlobalLayout>
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  ),
});
