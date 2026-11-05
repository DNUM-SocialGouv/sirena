import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RouteComponent } from './entite.edit';

const editEntite = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteAdministrativeAdminLocal: vi.fn(),
  useEditEntiteAdministrativeAdminLocal: () => ({ mutateAsync: editEntite, isPending: false }),
}));
vi.mock('@sirena/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sirena/ui')>();

  return { ...actual, Toast: { ...actual.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

const ENTITE_EDIT_PATH = '/admin/entite/edit';

const renderEntiteForm = async () => {
  await renderWithRouter(<RouteComponent />, { formPath: ENTITE_EDIT_PATH });
};

const emailInput = () => screen.getByLabelText(/Adresse e-mail de notification/);

const changeEmailTo = async (user: ReturnType<typeof userEvent.setup>, email: string) => {
  await user.clear(emailInput());
  await user.type(emailInput(), email);
};

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

beforeEach(() => {
  mockDsfrModals();
  vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
    data: {
      id: 'root-ars',
      nomComplet: 'ARS Normandie',
      label: 'ARS NOR',
      email: 'notification@ars.fr',
      emailContactUsager: 'contact@ars.fr',
      telContactUsager: '0102030405',
      adresseContactUsager: '1 rue de la Santé, Paris',
    },
    isPending: false,
    isError: false,
  } as never);
  editEntite.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('Admin local Entité edit page unsaved changes', () => {
  it('asks for confirmation when the admin leaves with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await changeEmailTo(user, 'alertes@ars.fr');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the admin leave without confirmation when the values match the saved ones', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await changeEmailTo(user, 'notification@ars.fr');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('goes back without confirmation when the admin clicks Annuler', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await changeEmailTo(user, 'alertes@ars.fr');
    await user.click(screen.getByRole('link', { name: 'Annuler' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('goes back without confirmation once the changes are saved', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await changeEmailTo(user, 'alertes@ars.fr');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('still asks for confirmation after a failed save', async () => {
    const user = userEvent.setup();
    editEntite.mockRejectedValue(new Error('network'));
    await renderEntiteForm();

    await changeEmailTo(user, 'alertes@ars.fr');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });
});
