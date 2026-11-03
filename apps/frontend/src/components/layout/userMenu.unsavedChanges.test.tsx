import { ROLES } from '@sirena/common/constants';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
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
const GuardedForm = () => {
  const [nom, setNom] = useState('');
  useUnsavedChangesGuard({ isDirty: nom !== '' });

  const handleNomChange = (event: React.ChangeEvent<HTMLInputElement>) => setNom(event.target.value);

  return (
    <label>
      Nom
      <input value={nom} onChange={handleNomChange} />
    </label>
  );
};

const PageWithForm = () => {
  const [isFormShown, setIsFormShown] = useState(true);
  const handleHideForm = () => setIsFormShown(false);

  return (
    <>
      <UserMenu />
      {isFormShown ? <GuardedForm /> : null}
      <button type="button" onClick={handleHideForm}>
        Masquer le formulaire
      </button>
    </>
  );
};

const renderPage = async (formPath: string) => {
  await renderWithRouter(<PageWithForm />, { formPath });
};

const openMenu = (user: User) => user.click(screen.getByRole('button', { name: /Mon espace/ }));

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const submittedForms: string[] = [];

beforeEach(() => {
  mockDsfrModals();
  submittedForms.length = 0;
  vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
    submittedForms.push(this.getAttribute('action') ?? '');
  });
  vi.mocked(useProfile).mockReturnValue({
    data: { nom: 'Jeanne', prenom: 'Dupont', email: 'jeanne.dupont@example.fr', role: { id: ROLES.ENTITY_ADMIN } },
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

describe.each([
  { button: 'Se déconnecter', action: '/api/auth/logout' },
  { button: 'Se déconnecter de ProConnect', action: '/api/auth/logout-proconnect' },
])('UserMenu « $button » button', ({ button, action }) => {
  it('logs out right away when nothing changed', async () => {
    const user = userEvent.setup();
    await renderPage('/request/req-1');

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(submittedForms).toEqual([action]));
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('logs out once the agent chooses Quitter sans enregistrer', async () => {
    const user = userEvent.setup();
    await renderPage('/request/req-1');

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await openMenu(user);
    await user.click(screen.getByRole('button', { name: button }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });

    expect(submittedForms).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' }));
    await waitFor(() => expect(submittedForms).toEqual([action]));
  });

  it('keeps the agent on the form when they choose Annuler', async () => {
    const user = userEvent.setup();
    await renderPage('/request/req-1');

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await openMenu(user);
    await user.click(screen.getByRole('button', { name: button }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(unsavedChangesDialog()).not.toBeInTheDocument());
    expect(submittedForms).toEqual([]);
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
  });
});

describe('UserMenu logout after the form is gone', () => {
  it('logs out right away once the form with unsaved changes has left the page', async () => {
    const user = userEvent.setup();
    await renderPage('/request/req-1');

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('button', { name: 'Masquer le formulaire' }));
    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(submittedForms).toEqual(['/api/auth/logout']));
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });
});
