import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RouteComponent } from './$entiteId.edit';

const editDirectionService = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'service-pa' }),
  }),
}));
vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionServiceAdminLocal: vi.fn(),
  useEditDirectionServiceAdminLocal: () => ({ mutateAsync: editDirectionService, isPending: false }),
}));
vi.mock('../-admin-local-route-guard', () => ({ requireAdminLocalAccess: vi.fn() }));
vi.mock('@sirena/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sirena/ui')>();

  return { ...actual, Toast: { ...actual.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

const SERVICE_EDIT_PATH = '/admin/directions-services/service-pa/edit';

const renderServiceForm = async () => {
  await renderWithRouter(<RouteComponent />, { formPath: SERVICE_EDIT_PATH });
};

const emailInput = () => screen.getByLabelText(/Adresse e-mail de notification/);

const changeEmailTo = async (user: ReturnType<typeof userEvent.setup>, email: string) => {
  await user.clear(emailInput());
  await user.type(emailInput(), email);
};

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

beforeEach(() => {
  mockDsfrModals();
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({
    data: {
      id: 'service-pa',
      entiteType: 'service',
      nomComplet: 'Service PA',
      label: 'PA',
      email: 'service-pa@ars.fr',
      parentDirection: { id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' },
    },
    isPending: false,
    isError: false,
  } as never);
  editDirectionService.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('Admin local Direction and Service edit page unsaved changes', () => {
  it('asks for confirmation when the admin leaves with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderServiceForm();

    await changeEmailTo(user, 'pa@ars.fr');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the admin leave without confirmation when the values match the saved ones', async () => {
    const user = userEvent.setup();
    await renderServiceForm();

    await changeEmailTo(user, 'service-pa@ars.fr');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('goes back without confirmation when the admin clicks Annuler', async () => {
    const user = userEvent.setup();
    await renderServiceForm();

    await changeEmailTo(user, 'pa@ars.fr');
    await user.click(screen.getByRole('link', { name: 'Annuler' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('goes back without confirmation once the changes are saved', async () => {
    const user = userEvent.setup();
    await renderServiceForm();

    await changeEmailTo(user, 'pa@ars.fr');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('still asks for confirmation after a failed save', async () => {
    const user = userEvent.setup();
    editDirectionService.mockRejectedValue(new Error('network'));
    await renderServiceForm();

    await changeEmailTo(user, 'pa@ars.fr');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });
});
