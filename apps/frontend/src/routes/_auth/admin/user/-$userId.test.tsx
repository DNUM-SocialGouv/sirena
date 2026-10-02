import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserById } from '@/hooks/queries/users.hook';
import { useListStateStore } from '@/stores/listStateStore';
import { Route } from './$userId';

const RouteComponent = (Route as unknown as { component: React.ComponentType }).component;

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
  useNavigate: () => vi.fn(),
  useRouter: () => ({ navigate: vi.fn(), history: { back: vi.fn() } }),
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

const backLink = () => screen.getByRole('link', { name: /^Liste des/ });

describe('User edition page back link', () => {
  beforeEach(() => {
    useListStateStore.setState({ states: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('goes back to the habilitation requests when opened from that list', () => {
    useListStateStore.getState().setListState('users', { to: '/admin/users', search: { offset: 10 } });
    mockUser(ROLES.PENDING);

    render(<RouteComponent />);

    expect(backLink()).toHaveTextContent('Liste des habilitations');
    expect(backLink()).toHaveAttribute('href', '/admin/users?offset=10');
  });

  it('goes back to the users list when opened from that list', () => {
    useListStateStore.getState().setListState('users', { to: '/admin/users/all', search: { search: 'dupont' } });
    mockUser(ROLES.WRITER);

    render(<RouteComponent />);

    expect(backLink()).toHaveTextContent('Liste des utilisateurs');
    expect(backLink()).toHaveAttribute('href', '/admin/users/all?search=dupont');
  });

  it('keeps the list it came from, whatever the role of the user', () => {
    useListStateStore.getState().setListState('users', { to: '/admin/users/all', search: {} });
    mockUser(ROLES.PENDING);

    render(<RouteComponent />);

    expect(backLink()).toHaveTextContent('Liste des utilisateurs');
    expect(backLink()).toHaveAttribute('href', '/admin/users/all');
  });

  it.each([
    [ROLES.PENDING, 'Liste des habilitations', '/admin/users'],
    [ROLES.ENTITY_ADMIN, 'Liste des utilisateurs', '/admin/users/all'],
  ])('without a remembered list (reload, new tab), infers it from the role %s', (roleId, label, href) => {
    mockUser(roleId);

    render(<RouteComponent />);

    expect(backLink()).toHaveTextContent(label);
    expect(backLink()).toHaveAttribute('href', href);
  });

  it('is never flagged as the current page', () => {
    mockUser(ROLES.WRITER);

    render(<RouteComponent />);

    expect(backLink()).toHaveAttribute('data-exact', 'true');
  });
});
