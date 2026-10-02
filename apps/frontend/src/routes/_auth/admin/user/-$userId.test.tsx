import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUserById } from '@/hooks/queries/users.hook';
import { RouteComponent } from './$userId';

const { addToastSpy, patchUserMutateAsyncSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  patchUserMutateAsyncSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ userId: 'user-1' }),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/admin/users">{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ navigate: vi.fn(), history: { back: vi.fn() } }),
}));

vi.mock('@/lib/router', () => ({ router: { navigate: vi.fn() } }));

vi.mock('@/hooks/queries/users.hook', () => ({ useUserById: vi.fn() }));

vi.mock('@/hooks/mutations/updateUser.hook', () => ({
  usePatchUser: () => ({ mutateAsync: patchUserMutateAsyncSpy, isPending: false }),
}));

vi.mock('@/lib/auth-guards', () => ({ requireAuthAndRoles: vi.fn(() => 'mocked-admin-guard') }));

vi.mock('@/stores/userStore', () => ({ useUserStore: () => ({ role: ROLES.SUPER_ADMIN }) }));

vi.mock('@/stores/listStateStore', () => ({ useListStateStore: () => undefined }));

vi.mock('@/components/userId/entityHierarchySelector', () => ({ EntityHierarchySelector: () => null }));

vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { ...actual.Toast, useToastManager: () => ({ add: addToastSpy }) } };
});

const renderRoute = () => {
  vi.mocked(useUserById).mockReturnValue({
    data: {
      id: 'user-1',
      nom: 'Dupont',
      prenom: 'Marie',
      email: 'marie.dupont@example.com',
      roleId: ROLES.WRITER,
      statutId: STATUT_TYPES.ACTIF,
      entiteId: null,
    },
    isPending: false,
    isError: false,
    error: null,
  } as never);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouteComponent />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin user edit route — RGAA 11.10 required fields', () => {
  it('announces upfront that fields are optional unless stated otherwise', () => {
    renderRoute();

    expect(screen.getByText('Sauf mention contraire, les champs sont facultatifs.')).toBeVisible();
  });

  it('spells out the required fields instead of marking them with an asterisk', () => {
    renderRoute();

    expect(screen.getByRole('combobox', { name: 'Rôle (obligatoire)' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Statut (obligatoire)' })).toBeRequired();
    expect(screen.queryByRole('combobox', { name: /\*/ })).not.toBeInTheDocument();
  });
});
