import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserById } from '@/hooks/queries/users.hook';
import { useListStateStore } from '@/stores/listStateStore';
import { RouteComponent } from './$userId';

const { routerNavigateSpy, navigateSpy } = vi.hoisted(() => ({ routerNavigateSpy: vi.fn(), navigateSpy: vi.fn() }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => ({ userId: 'user-1' }),
  }),
  Link: ({
    to,
    search,
    activeOptions,
    children,
  }: {
    to: string;
    search?: Record<string, unknown>;
    activeOptions?: { exact?: boolean };
    children: React.ReactNode;
  }) => (
    <a
      href={`${to}${search && Object.keys(search).length ? `?${new URLSearchParams(search as Record<string, string>)}` : ''}`}
      data-exact={String(activeOptions?.exact ?? false)}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigateSpy,
  useRouter: () => ({ navigate: routerNavigateSpy, history: { back: vi.fn() } }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: () => ({ data: { id: 'admin-1' } }),
}));

vi.mock('@/hooks/queries/users.hook', () => ({
  useUserById: vi.fn(),
}));

vi.mock('@/hooks/mutations/updateUser.hook', () => ({
  usePatchUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  profileQueryOptions: () => ({ queryKey: ['profile'] }),
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => 'mocked-guard'),
}));

vi.mock('@/components/userId/entityHierarchySelector', () => ({
  EntityHierarchySelector: () => null,
}));

vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { useToastManager: () => ({ add: vi.fn() }) } };
});

const mockUser = (roleId: string) => {
  vi.mocked(useUserById).mockReturnValue({
    data: {
      id: 'user-1',
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@example.com',
      roleId,
      statutId: roleId === ROLES.PENDING ? STATUT_TYPES.NON_RENSEIGNE : STATUT_TYPES.ACTIF,
      entiteId: null,
    },
    isPending: false,
    isError: false,
    error: null,
  } as never);
};

describe('User edition page navigation', () => {
  beforeEach(() => {
    useListStateStore.setState({ states: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('navigates back to the list it was opened from when there is no history', async () => {
    useListStateStore.getState().setListState('users', { to: '/admin/users/all', search: { search: 'dupont' } });
    mockUser(ROLES.WRITER);

    render(<RouteComponent />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler les modifications' }));

    expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/users/all', search: { search: 'dupont' } });
  });

  it('redirects an unknown user to the list it was opened from', () => {
    useListStateStore.getState().setListState('users', { to: '/admin/users/all', search: { search: 'dupont' } });
    vi.mocked(useUserById).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: { status: 404 },
    } as never);

    render(<RouteComponent />);

    expect(navigateSpy).toHaveBeenCalledWith({ to: '/admin/users/all', search: { search: 'dupont' } });
  });
});

describe('User edition page required fields (RGAA 11.10)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('announces upfront that fields are optional unless stated otherwise', () => {
    mockUser(ROLES.WRITER);

    render(<RouteComponent />);

    expect(screen.getByText('Sauf mention contraire, les champs sont facultatifs.')).toBeVisible();
  });

  it('spells out the required fields instead of marking them with an asterisk', () => {
    mockUser(ROLES.WRITER);

    render(<RouteComponent />);

    expect(screen.getByRole('combobox', { name: 'Rôle (obligatoire)' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Statut (obligatoire)' })).toBeRequired();
    expect(screen.queryByRole('combobox', { name: /\*/ })).not.toBeInTheDocument();
  });
});
