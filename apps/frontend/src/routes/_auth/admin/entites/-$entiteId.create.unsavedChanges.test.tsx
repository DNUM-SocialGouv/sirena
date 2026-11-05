import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RouteComponent } from './$entiteId.create';

const createEntite = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => ({ entiteId: 'root-ars' }),
  }),
}));
vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteByIdAdmin: vi.fn(),
  useEntiteChain: vi.fn(),
  useCreateDirectionOrServiceAdmin: () => ({ mutateAsync: createEntite, isPending: false }),
}));
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

const CREATE_PATH = '/admin/entites/root-ars/create';

type User = ReturnType<typeof userEvent.setup>;

const renderCreateForm = async () => {
  await renderWithRouter(<RouteComponent />, { formPath: CREATE_PATH });
};

const fillRequiredFields = async (user: User) => {
  await user.type(screen.getByLabelText(/Nom - libellé long/), 'Direction de la prévention');
  await user.type(screen.getByLabelText(/Nom court/), 'DIR PREV');
  await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/ }), 'oui');
};

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

beforeEach(() => {
  mockDsfrModals();
  vi.mocked(useEntiteByIdAdmin).mockReturnValue({
    data: { id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR', isActive: true },
    isPending: false,
    isError: false,
  } as never);
  vi.mocked(useEntiteChain).mockReturnValue({
    data: [{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }],
    isPending: false,
    isError: false,
  } as never);
  createEntite.mockReset().mockResolvedValue({ id: 'direction-1' });
  vi.mocked(notifySaveNetworkFailure).mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Admin Direction or Service creation page unsaved changes', () => {
  it('asks for confirmation when the admin leaves with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderCreateForm();

    await user.type(screen.getByLabelText(/Nom court/), 'DIR PREV');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the admin leave an untouched screen without confirmation', async () => {
    const user = userEvent.setup();
    await renderCreateForm();

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('opens the created entity without confirmation', async () => {
    const user = userEvent.setup();
    await renderCreateForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('still asks for confirmation after a failed creation', async () => {
    const user = userEvent.setup();
    createEntite.mockRejectedValue(new HttpError('Conflict', 409));
    await renderCreateForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('still asks for confirmation after a validation error', async () => {
    const user = userEvent.setup();
    await renderCreateForm();

    await user.type(screen.getByLabelText(/Nom court/), 'DIR PREV');
    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
    expect(createEntite).not.toHaveBeenCalled();
  });
});

describe('Admin Direction or Service creation page failed creation', () => {
  it('tells the admin when the creation never reached the server', async () => {
    const user = userEvent.setup();
    createEntite.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderCreateForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => expect(notifySaveNetworkFailure).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(/Nom court/)).toHaveValue('DIR PREV');
  });

  // The request helpers already toast every HTTP error.
  it('adds nothing to the toast an HTTP error already shows', async () => {
    const user = userEvent.setup();
    createEntite.mockRejectedValue(new HttpError('Forbidden', 403));
    await renderCreateForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => expect(createEntite).toHaveBeenCalledOnce());
    expect(notifySaveNetworkFailure).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nom court/)).toHaveValue('DIR PREV');
  });
});
