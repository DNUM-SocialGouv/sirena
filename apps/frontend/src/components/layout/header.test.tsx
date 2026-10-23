import { setLink } from '@codegouvfr/react-dsfr/link';
import { CGU_VERSION, FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useUserStore } from '@/stores/userStore';
import { HeaderMenu } from './header';

vi.mock('./userMenu', () => ({ UserMenu: () => null }));

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
  afterEach(() => {
    useUserStore.setState({ isLogged: false, role: null, cguAcceptedVersion: null });
    useFeatureFlagStore.getState().reset();
  });

  it('points the home link to the home page whatever the current page', async () => {
    await renderHeaderAt('/mentions-legales');

    for (const link of screen.getAllByTitle('Accueil - SIRENA')) {
      expect(link).toHaveAttribute('href', '/');
    }
  });

  it('shows the statistics link once the CGU in force are accepted', async () => {
    useUserStore.setState({ isLogged: true, role: ROLES.READER, cguAcceptedVersion: CGU_VERSION });
    useFeatureFlagStore.getState().setFlags({ [FEATURE_FLAGS.CGU_ACCEPTANCE]: true });

    await renderHeaderAt('/');

    expect(screen.getAllByRole('link', { name: 'Indicateurs' }).length).toBeGreaterThan(0);
  });

  it('hides the statistics link while the CGU in force are not accepted', async () => {
    useUserStore.setState({ isLogged: true, role: ROLES.READER, cguAcceptedVersion: 'previous-version' });
    useFeatureFlagStore.getState().setFlags({ [FEATURE_FLAGS.CGU_ACCEPTANCE]: true });

    await renderHeaderAt('/');

    expect(screen.queryByRole('link', { name: 'Indicateurs' })).not.toBeInTheDocument();
  });

  it('keeps the statistics link while the CGU acceptance is not enabled', async () => {
    useUserStore.setState({ isLogged: true, role: ROLES.READER, cguAcceptedVersion: null });

    await renderHeaderAt('/');

    expect(screen.getAllByRole('link', { name: 'Indicateurs' }).length).toBeGreaterThan(0);
  });
});
