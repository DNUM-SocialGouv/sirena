import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { UnsavedChangesModal } from '@/components/unsavedChanges/UnsavedChangesModal';
import { useUnsavedChangesStore } from '@/stores/unsavedChangesStore';

export const OTHER_PAGE_LINK = 'Autre page';
export const OTHER_PAGE_HEADING = 'Page suivante';

/**
 * Renders `ui` on `/` inside a real in-memory router, with the global unsaved changes modal mounted.
 * A link named OTHER_PAGE_LINK leads to `/home`; every path other than `/` renders a heading named OTHER_PAGE_HEADING.
 */
export const renderWithRouter = async (ui: ReactNode) => {
  useUnsavedChangesStore.setState({ pendingResolve: null });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Link to="/home">{OTHER_PAGE_LINK}</Link>
        <Outlet />
        <UnsavedChangesModal />
      </>
    ),
  });
  const formRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => ui });
  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: () => <h1>{OTHER_PAGE_HEADING}</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([formRoute, otherRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('link', { name: OTHER_PAGE_LINK });
  return router;
};

/** The DSFR opens modals through its vanilla JS, absent from jsdom: emulate its open attribute and events. */
export const mockDsfrModals = () => {
  Object.defineProperty(window, 'dsfr', {
    configurable: true,
    writable: true,
    value: (element: HTMLElement | null) => ({
      modal: {
        disclose: () => {
          element?.setAttribute('open', '');
          element?.dispatchEvent(new CustomEvent('dsfr.disclose'));
        },
        conceal: () => {
          element?.removeAttribute('open');
          element?.dispatchEvent(new CustomEvent('dsfr.conceal'));
        },
      },
    }),
  });
};
