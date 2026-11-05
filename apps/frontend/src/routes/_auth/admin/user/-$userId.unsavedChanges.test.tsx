import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { QueryClient } from '@tanstack/react-query';
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUserById } from '@/lib/api/fetchUsers';
import { useUserStore } from '@/stores/userStore';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RouteComponent } from './$userId';

const patchUser = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => ({ userId: 'user-1' }),
  }),
}));
vi.mock('@/lib/api/fetchUsers', () => ({ fetchUserById: vi.fn(), fetchUsers: vi.fn() }));
vi.mock('@/lib/api/fetchProfile', () => ({ fetchProfile: vi.fn() }));
vi.mock('@/hooks/mutations/updateUser.hook', () => ({
  usePatchUser: () => ({ mutateAsync: patchUser, isPending: false }),
}));
vi.mock('@/components/userId/entityHierarchySelector', () => ({ EntityHierarchySelector: () => null }));
vi.mock('@sirena/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sirena/ui')>();

  return { ...actual, Toast: { ...actual.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

const USER_FORM_PATH = '/admin/user/user-1';
const USERS_LIST_PATH = '/admin/users/all';

const serverUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean.dupont@example.com',
  roleId: ROLES.WRITER,
  statutId: STATUT_TYPES.ACTIF,
  entiteId: null,
  ...overrides,
});

const renderUserForm = async (options: { previousPath?: string } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(['user', 'user-1'], serverUser());

  await renderWithRouter(<RouteComponent />, { formPath: USER_FORM_PATH, queryClient, ...options });

  return queryClient;
};

const deliverServerUser = async (queryClient: QueryClient, overrides: Record<string, unknown>) => {
  await act(async () => {
    queryClient.setQueryData(['user', 'user-1'], serverUser(overrides));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const statutSelect = () => screen.getByRole('combobox', { name: 'Statut (obligatoire)' });

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

beforeEach(() => {
  mockDsfrModals();
  useUserStore.getState().setRole(ROLES.SUPER_ADMIN);
  vi.mocked(fetchUserById).mockResolvedValue(serverUser() as never);
  patchUser.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('User edition page unsaved changes', () => {
  it('asks for confirmation when the admin leaves with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderUserForm();

    await user.selectOptions(statutSelect(), STATUT_TYPES.INACTIF);
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the admin leave without confirmation when the values match the saved ones', async () => {
    const user = userEvent.setup();
    await renderUserForm();

    await user.selectOptions(statutSelect(), STATUT_TYPES.INACTIF);
    await user.selectOptions(statutSelect(), STATUT_TYPES.ACTIF);
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('goes back without confirmation when the admin clicks Annuler les modifications', async () => {
    const user = userEvent.setup();
    await renderUserForm({ previousPath: USERS_LIST_PATH });

    await user.selectOptions(statutSelect(), STATUT_TYPES.INACTIF);
    await user.click(screen.getByRole('button', { name: 'Annuler les modifications' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('goes back without confirmation once the changes are saved', async () => {
    const user = userEvent.setup();
    await renderUserForm({ previousPath: USERS_LIST_PATH });

    await user.selectOptions(statutSelect(), STATUT_TYPES.INACTIF);
    await user.click(screen.getByRole('button', { name: 'Modifier les informations de l’utilisateur' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('still asks for confirmation after a failed save', async () => {
    const user = userEvent.setup();
    patchUser.mockRejectedValue(new Error('network'));
    await renderUserForm();

    await user.selectOptions(statutSelect(), STATUT_TYPES.INACTIF);
    await user.click(screen.getByRole('button', { name: 'Modifier les informations de l’utilisateur' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });
});

describe('User edition page server data', () => {
  it('keeps the admin input when the user is fetched again during an edit', async () => {
    const user = userEvent.setup();
    const queryClient = await renderUserForm();

    await user.selectOptions(statutSelect(), STATUT_TYPES.INACTIF);
    await deliverServerUser(queryClient, { roleId: ROLES.READER });

    expect(statutSelect()).toHaveValue(STATUT_TYPES.INACTIF);
    expect(screen.getByRole('combobox', { name: 'Rôle (obligatoire)' })).toHaveValue(ROLES.WRITER);
  });

  it('shows the new server data, as the new baseline, when the admin has changed nothing', async () => {
    const user = userEvent.setup();
    const queryClient = await renderUserForm();

    await deliverServerUser(queryClient, { statutId: STATUT_TYPES.INACTIF });

    expect(statutSelect()).toHaveValue(STATUT_TYPES.INACTIF);
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });
});
