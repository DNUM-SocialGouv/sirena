import { act, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editEntiteAdmin, fetchEntiteByIdAdmin, fetchEntiteChain } from '@/lib/api/fetchEntites';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { queryClient } from '@/lib/queryClient';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RouteComponent } from './$entiteId.index';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => ({ entiteId: 'root-ars' }),
  }),
}));

vi.mock('@/lib/api/fetchEntites', () => ({
  createDirectionAdminLocal: vi.fn(),
  createDirectionOrServiceAdmin: vi.fn(),
  createServiceAdminLocal: vi.fn(),
  editDirectionServiceAdminLocal: vi.fn(),
  editEntiteAdmin: vi.fn(),
  editEntiteAdministrativeAdminLocal: vi.fn(),
  fetchDirectionServiceAdminLocal: vi.fn(),
  fetchDirectionsServicesList: vi.fn(),
  fetchEntiteAdministrativeAdminLocal: vi.fn(),
  fetchEntiteByIdAdmin: vi.fn(),
  fetchEntiteChain: vi.fn(),
  fetchEntiteDescendants: vi.fn(),
  fetchEntites: vi.fn(),
  fetchEntitesListAdmin: vi.fn(),
  fetchRootEntitesListAdmin: vi.fn(),
}));
// The real module reaches the app router, which the createFileRoute mock above breaks.
vi.mock('@/lib/api/tanstackQuery', () => ({
  HttpError: class HttpError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));
vi.mock('@/lib/api/saveError', () => ({ notifySaveNetworkFailure: vi.fn() }));
vi.mock('@sirena/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sirena/ui')>();

  return { ...actual, Toast: { ...actual.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

const ENTITE_FORM_PATH = '/admin/entites/root-ars';
const ENTITE_QUERY_KEY = ['entite', 'admin', 'root-ars'];

const serverEntite = (overrides: Record<string, unknown> = {}) => ({
  id: 'root-ars',
  nomComplet: 'ARS Normandie',
  label: 'ARS NOR',
  email: 'contact@ars.fr',
  emailContactUsager: '',
  adresseContactUsager: '',
  telContactUsager: '',
  isActive: true,
  ...overrides,
});

const renderEntiteForm = async () => {
  await renderWithRouter(<RouteComponent />, { formPath: ENTITE_FORM_PATH, queryClient });
  await screen.findByRole('button', { name: 'Valider les modifications' });
};

// React Query notifies its observers on the next tick.
const deliverServerEntite = async (overrides: Record<string, unknown>) => {
  vi.mocked(fetchEntiteByIdAdmin).mockResolvedValue(serverEntite(overrides) as never);

  await act(async () => {
    queryClient.setQueryData(ENTITE_QUERY_KEY, serverEntite(overrides));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const nomCompletInput = () => screen.getByLabelText(/Nom - libellé long/);

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const renameTo = async (user: ReturnType<typeof userEvent.setup>, nomComplet: string) => {
  await user.clear(nomCompletInput());
  await user.type(nomCompletInput(), nomComplet);
};

beforeEach(() => {
  mockDsfrModals();
  vi.mocked(fetchEntiteByIdAdmin).mockResolvedValue(serverEntite() as never);
  vi.mocked(fetchEntiteChain).mockResolvedValue([
    { id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false },
  ] as never);
  vi.mocked(editEntiteAdmin).mockReset();
  vi.mocked(notifySaveNetworkFailure).mockReset();
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

describe('Admin entity edit page unsaved changes', () => {
  it('asks for confirmation when the admin leaves with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the admin leave without confirmation when the values match the saved ones', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await renameTo(user, 'ARS Normandie ');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('goes back to the list without confirmation when the admin clicks Annuler', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await user.click(screen.getByRole('link', { name: 'Annuler' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('lets the admin leave without confirmation once the changes are saved', async () => {
    const user = userEvent.setup();
    vi.mocked(editEntiteAdmin).mockResolvedValue(serverEntite({ nomComplet: 'ARS Bretagne' }) as never);
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));
    await screen.findByRole('heading', { level: 2, name: /ARS Bretagne/ });
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('still asks for confirmation after a failed save', async () => {
    const user = userEvent.setup();
    vi.mocked(editEntiteAdmin).mockRejectedValue(new Error('network'));
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('still asks for confirmation after a validation error', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await user.clear(nomCompletInput());
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
    expect(editEntiteAdmin).not.toHaveBeenCalled();
  });
});

describe('Admin entity edit page failed save', () => {
  it('tells the admin when the save never reached the server', async () => {
    const user = userEvent.setup();
    vi.mocked(editEntiteAdmin).mockRejectedValue(new TypeError('Failed to fetch'));
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    await waitFor(() => expect(notifySaveNetworkFailure).toHaveBeenCalledOnce());
    expect(nomCompletInput()).toHaveValue('ARS Bretagne');
  });

  // The request helpers already toast every HTTP error.
  it('adds nothing to the toast an HTTP error already shows', async () => {
    const user = userEvent.setup();
    vi.mocked(editEntiteAdmin).mockRejectedValue(new HttpError('Forbidden', 403));
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    await waitFor(() => expect(editEntiteAdmin).toHaveBeenCalledOnce());
    expect(notifySaveNetworkFailure).not.toHaveBeenCalled();
    expect(nomCompletInput()).toHaveValue('ARS Bretagne');
  });
});

describe('Admin entity edit page server data', () => {
  it('keeps the admin input when the entity is fetched again during an edit', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await renameTo(user, 'ARS Bretagne');
    await deliverServerEntite({ label: 'ARS NOR 2' });

    expect(nomCompletInput()).toHaveValue('ARS Bretagne');
    expect(screen.getByLabelText(/Nom court/)).toHaveValue('ARS NOR');
  });

  it('shows the new server data, as the new baseline, when the admin has changed nothing', async () => {
    const user = userEvent.setup();
    await renderEntiteForm();

    await deliverServerEntite({ label: 'ARS NOR 2' });

    expect(screen.getByLabelText(/Nom court/)).toHaveValue('ARS NOR 2');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });
});
