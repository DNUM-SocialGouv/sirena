import { createMemoryHistory, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as rootRoute } from '@/routes/__root';
import indexHtml from '../../index.html?raw';

vi.mock('@/components/layout/globalLayout', () => ({
  GlobalLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtools: () => null,
}));

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <h1>Accueil</h1>,
});
const indicatorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/indicateurs',
  head: () => ({ meta: [{ title: 'Indicateurs - SIRENA' }] }),
  component: () => <h1>Indicateurs</h1>,
});
const routeTree = rootRoute.addChildren([homeRoute, indicatorsRoute]);

const renderAt = async (path: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
};

let previousHead: string;

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  previousHead = document.head.innerHTML;
  // Keep the real entry HTML: an empty test head would hide duplicate static titles.
  const initialDocument = new DOMParser().parseFromString(indexHtml, 'text/html');
  document.head.replaceChildren(...Array.from(initialDocument.head.childNodes));
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = previousHead;
  vi.restoreAllMocks();
});

describe('document head', () => {
  it('shows only the route title when the router mounts over the entry HTML', async () => {
    await renderAt('/indicateurs');

    await waitFor(() => {
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
      expect(document.title).toBe('Indicateurs - SIRENA');
    });
  });

  it('restores a single default title when navigating to a route without its own title', async () => {
    const router = await renderAt('/indicateurs');
    await waitFor(() => expect(document.title).toBe('Indicateurs - SIRENA'));

    await act(async () => {
      await router.navigate({ to: '/' });
    });

    await waitFor(() => {
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
      expect(document.title).toBe('SIRENA');
    });
  });
});
