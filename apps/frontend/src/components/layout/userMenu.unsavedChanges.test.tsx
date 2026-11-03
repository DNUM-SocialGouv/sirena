import { ROLES } from '@sirena/common/constants';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '@/components/unsavedChanges/useUnsavedChangesGuard';
import { useProfile } from '@/hooks/queries/profile.hook';
import { mockDsfrModals, OTHER_PAGE_HEADING, renderWithRouter } from '@/test-utils/renderWithRouter';
import { UserMenu } from './userMenu';

const routeState = vi.hoisted(() => ({ isAdminRoute: false }));

vi.mock('@/hooks/queries/profile.hook', () => ({ useProfile: vi.fn() }));
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();

  return {
    ...actual,
    useMatches: () => {
      const matches = actual.useMatches();

      return routeState.isAdminRoute ? [{ routeId: '/_auth/admin/users' }] : matches;
    },
  };
});

type User = ReturnType<typeof userEvent.setup>;

// Stands for any guarded form of the page the menu sits on.
const PageWithForm = () => {
  const [nom, setNom] = useState('');
  useUnsavedChangesGuard({ isDirty: nom !== '' });

  const handleNomChange = (event: React.ChangeEvent<HTMLInputElement>) => setNom(event.target.value);

  return (
    <>
      <UserMenu />
      <label>
        Nom
        <input value={nom} onChange={handleNomChange} />
      </label>
    </>
  );
};

const renderPage = async (formPath: string) => {
  await renderWithRouter(<PageWithForm />, { formPath });
};

const openMenu = (user: User) => user.click(screen.getByRole('button', { name: /Mon espace/ }));

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

beforeEach(() => {
  mockDsfrModals();
  vi.mocked(useProfile).mockReturnValue({
    data: { nom: 'Jeanne', prenom: 'Dupont', email: 'jeanne.dupont@example.fr', role: { id: ROLES.ENTITY_ADMIN } },
  } as never);
});

afterEach(() => {
  cleanup();
});

describe.each([
  { link: 'Espace administrateur', formPath: '/request/req-1', href: '/admin/users', isAdminRoute: false },
  { link: 'Liste des requêtes', formPath: '/admin/user/user-1', href: '/home', isAdminRoute: true },
])('UserMenu « $link » link', ({ link, formPath, href, isAdminRoute }) => {
  beforeEach(() => {
    routeState.isAdminRoute = isAdminRoute;
  });

  it('keeps its destination', async () => {
    const user = userEvent.setup();
    await renderPage(formPath);

    await openMenu(user);

    expect(screen.getByRole('link', { name: link })).toHaveAttribute('href', href);
  });

  it('asks for confirmation when a form of the page has unsaved changes', async () => {
    const user = userEvent.setup();
    await renderPage(formPath);

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await openMenu(user);
    await user.click(screen.getByRole('link', { name: link }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('leaves without confirmation when nothing changed', async () => {
    const user = userEvent.setup();
    await renderPage(formPath);

    await openMenu(user);
    await user.click(screen.getByRole('link', { name: link }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });
});
