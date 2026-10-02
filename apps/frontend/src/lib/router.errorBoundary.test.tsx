import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routerFallbackComponents } from './routerFallbacks';

const ERROR_MESSAGE = 'Explosion au rendu';

let shouldThrow = true;

const BrokenComponent = () => {
  if (shouldThrow) {
    throw new Error(ERROR_MESSAGE);
  }
  return <p>Contenu de la page</p>;
};

const rootRoute = createRootRoute();
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <h1>Accueil</h1> });
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <h1>Connexion</h1>,
});
const brokenRoute = createRoute({ getParentRoute: () => rootRoute, path: '/casse', component: BrokenComponent });
const guardedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/protege',
  beforeLoad: () => {
    throw redirect({ to: '/login' });
  },
  component: () => <h1>Espace protégé</h1>,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, brokenRoute, guardedRoute]);

const renderAt = async (initialPath: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    ...routerFallbackComponents,
  });
  await router.load();
  return render(<RouterProvider router={router} />);
};

describe('repli du routeur', () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('affiche l’écran de repli au lieu d’une page vide quand le rendu d’une route échoue', async () => {
    const { container } = await renderAt('/casse');

    expect(screen.getByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });

  it('re-rend la route quand l’utilisateur clique sur Réessayer', async () => {
    const user = userEvent.setup();
    await renderAt('/casse');

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('Contenu de la page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Une erreur est survenue' })).not.toBeInTheDocument();
  });

  it('affiche le message d’exception en développement', async () => {
    await renderAt('/casse');

    expect(screen.getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });

  it('n’expose pas le message d’exception hors développement', async () => {
    vi.stubEnv('DEV', false);

    await renderAt('/casse');

    expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
  });

  it('affiche la page introuvable pour une URL inconnue', async () => {
    await renderAt('/url-qui-n-existe-pas');

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toBeInTheDocument();
  });

  it('laisse une redirection levée dans beforeLoad s’appliquer', async () => {
    await renderAt('/protege');

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Une erreur est survenue' })).not.toBeInTheDocument();
  });
});
