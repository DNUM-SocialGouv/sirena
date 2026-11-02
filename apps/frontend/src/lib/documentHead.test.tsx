import { createMemoryHistory, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as rootRoute } from '@/routes/__root';
import { Route as donneesPersonnellesRoute } from '@/routes/_public/donnees-personnelles';
import { Route as gestionCookiesRoute } from '@/routes/_public/gestion-cookies';
import { Route as mentionsLegalesRoute } from '@/routes/_public/mentions-legales';
import { Route as publicRoute } from '@/routes/_public/route';
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
publicRoute.options = {
  id: '/_public',
  getParentRoute: () => rootRoute,
  component: publicRoute.options.component,
};

const routeTree = rootRoute.addChildren([
  homeRoute,
  indicatorsRoute,
  publicRoute.addChildren([
    createRoute({
      head: mentionsLegalesRoute.options.head,
      component: mentionsLegalesRoute.options.component,
      getParentRoute: () => publicRoute,
      path: '/mentions-legales',
    }),
    createRoute({
      head: donneesPersonnellesRoute.options.head,
      component: donneesPersonnellesRoute.options.component,
      getParentRoute: () => publicRoute,
      path: '/donnees-personnelles',
    }),
    createRoute({
      head: gestionCookiesRoute.options.head,
      component: gestionCookiesRoute.options.component,
      getParentRoute: () => publicRoute,
      path: '/gestion-cookies',
    }),
  ]),
]);

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
  it('shows the legal notice page title on direct access', async () => {
    await renderAt('/mentions-legales');

    expect(await screen.findByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
      expect(document.title).toBe('Mentions légales - SIRENA');
    });
  });

  it('shows the personal data page title on direct access', async () => {
    await renderAt('/donnees-personnelles');

    expect(await screen.findByRole('heading', { level: 1, name: 'Données personnelles' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
      expect(document.title).toBe('Données personnelles - SIRENA');
    });
  });

  it('shows the cookie management page title on direct access', async () => {
    await renderAt('/gestion-cookies');

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestion des cookies' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
      expect(document.title).toBe('Gestion des cookies - SIRENA');
    });
  });

  it('updates a single title when navigating between public pages', async () => {
    const router = await renderAt('/mentions-legales');
    await waitFor(() => expect(document.title).toBe('Mentions légales - SIRENA'));

    const pages = [
      { path: '/donnees-personnelles', heading: 'Données personnelles', title: 'Données personnelles - SIRENA' },
      { path: '/gestion-cookies', heading: 'Gestion des cookies', title: 'Gestion des cookies - SIRENA' },
      { path: '/mentions-legales', heading: 'Mentions légales', title: 'Mentions légales - SIRENA' },
    ] as const;

    for (const { path, heading, title } of pages) {
      await act(async () => {
        await router.navigate({ to: path });
      });

      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      await waitFor(() => {
        expect(document.head.querySelectorAll('title')).toHaveLength(1);
        expect(document.title).toBe(title);
      });
    }
  });

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
