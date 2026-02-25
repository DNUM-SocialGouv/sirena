import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { GlobalLayout } from '@/components/layout/globalLayout';

export const Route = createRootRouteWithContext()({
  component: () => (
    <>
      <HeadContent />
      <GlobalLayout>
        <Outlet />
      </GlobalLayout>
      <TanStackRouterDevtools />
    </>
  ),
});
