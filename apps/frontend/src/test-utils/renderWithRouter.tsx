import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserHistory,
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
 * Renders `ui` on `formPath` (`/` by default) inside a real in-memory router, with the global unsaved changes modal mounted.
 * A link named OTHER_PAGE_LINK leads to `/home`; every other path renders a heading named OTHER_PAGE_HEADING.
 * With `previousPath`, the browser history holds that page before the form, so the user can go back to it.
 * It uses the jsdom browser history: the in-memory one never consults blockers on back and forward.
 * Pass a `queryClient` to seed or update the query data the form reads.
 */
export const renderWithRouter = async (
  ui: ReactNode,
  {
    previousPath,
    formPath = '/',
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }: { previousPath?: string; formPath?: string; queryClient?: QueryClient } = {},
) => {
  useUnsavedChangesStore.setState({ pendingResolve: null });

  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Link to="/home">{OTHER_PAGE_LINK}</Link>
        <Outlet />
        <UnsavedChangesModal />
      </>
    ),
  });

  const formRoute = createRoute({ getParentRoute: () => rootRoute, path: formPath, component: () => ui });

  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: () => <h1>{OTHER_PAGE_HEADING}</h1>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([formRoute, otherRoute]),
    history: previousPath
      ? createBrowserHistoryAfter(previousPath, formPath)
      : createMemoryHistory({ initialEntries: [formPath] }),
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

// The router must push the entries itself: it tracks their position in their state to undo a blocked back.
const createBrowserHistoryAfter = (previousPath: string, formPath: string) => {
  window.history.replaceState(null, '', previousPath);

  const history = createBrowserHistory();
  history.push(formPath);

  return history;
};

/** What the DSFR vanilla JS does when the user closes a modal with Fermer, Escape or the backdrop. */
export const closeDsfrModalNatively = (dialog: HTMLElement) => {
  dialog.removeAttribute('open');
  dialog.dispatchEvent(new CustomEvent('dsfr.conceal'));
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
