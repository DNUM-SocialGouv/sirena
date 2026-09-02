import { setLink } from '@codegouvfr/react-dsfr/link';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeaderMenu } from './header';

setLink({ Link });

const rootRoute = createRootRoute({ component: () => <HeaderMenu homeTo="/" /> });
const childRoutes = ['/', '/mentions-legales'].map((path) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: () => null }),
);
const routeTree = rootRoute.addChildren(childRoutes);

const renderHeaderAt = async (initialPath: string) => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }) });
  await router.load();
  render(<RouterProvider router={router} />);
};

describe('HeaderMenu', () => {
  it('points the home link to the home page whatever the current page', async () => {
    await renderHeaderAt('/mentions-legales');

    for (const link of screen.getAllByTitle('Accueil - SIRENA')) {
      expect(link).toHaveAttribute('href', '/');
    }
  });
});
