import { setLink } from '@codegouvfr/react-dsfr/link';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { AppFooter } from './footer';
import { HeaderMenu } from './header';

vi.mock('@/hooks/queries/version.hook', () => ({
  useVersion: () => ({ data: { version: '1.0.0' } }),
}));

setLink({ Link });

const Layout = () => (
  <>
    <HeaderMenu homeTo="/" />
    <AppFooter />
  </>
);

const rootRoute = createRootRoute({ component: Layout });
const childRoutes = [
  '/',
  '/accessibilite',
  '/mentions-legales',
  '/donnees-personnelles',
  '/conditions-generales-utilisation',
  '/gestion-cookies',
].map((path) => createRoute({ getParentRoute: () => rootRoute, path, component: () => null }));
const routeTree = rootRoute.addChildren(childRoutes);

const renderFooterAt = async (initialPath: string) => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }) });
  await router.load();
  render(<RouterProvider router={router} />);
};

describe('AppFooter', () => {
  beforeEach(() => {
    useFeatureFlagStore.getState().setFlags({ [FEATURE_FLAGS.CGU_ACCEPTANCE]: true });
  });

  afterEach(() => {
    useFeatureFlagStore.getState().reset();
  });

  it.each([false, undefined])('hides only the CGU link when CGU_ACCEPTANCE is %s', async (enabled) => {
    useFeatureFlagStore.getState().setFlags(enabled === undefined ? {} : { [FEATURE_FLAGS.CGU_ACCEPTANCE]: enabled });

    await renderFooterAt('/');

    expect(screen.queryByRole('link', { name: 'Conditions générales d’utilisation' })).not.toBeInTheDocument();

    for (const name of [
      'Accessibilité : partiellement conforme',
      'Mentions légales',
      'Données personnelles',
      'Gestion des cookies',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it.each([
    ['Accessibilité : partiellement conforme', '/accessibilite'],
    ['Mentions légales', '/mentions-legales'],
    ['Données personnelles', '/donnees-personnelles'],
    ['Conditions générales d’utilisation', '/conditions-generales-utilisation'],
    ['Gestion des cookies', '/gestion-cookies'],
  ])('points %s to %s whatever the current page', async (name, href) => {
    await renderFooterAt('/accessibilite');

    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });

  it('lists the legal links with the CGU right before cookie management', async () => {
    const legalLinks = [
      'Mentions légales',
      'Données personnelles',
      'Conditions générales d’utilisation',
      'Gestion des cookies',
    ];

    await renderFooterAt('/');

    const names = screen.getAllByRole('link').map((link) => link.textContent?.trim() ?? '');
    expect(names.filter((name) => legalLinks.includes(name))).toEqual(legalLinks);
  });

  it('marks only the current page link with aria-current', async () => {
    await renderFooterAt('/mentions-legales');

    expect(screen.getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Données personnelles' })).not.toHaveAttribute('aria-current');
  });

  it('marks the CGU link as current on the CGU page', async () => {
    await renderFooterAt('/conditions-generales-utilisation');

    expect(screen.getByRole('link', { name: 'Conditions générales d’utilisation' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Gestion des cookies' })).not.toHaveAttribute('aria-current');
  });
});
