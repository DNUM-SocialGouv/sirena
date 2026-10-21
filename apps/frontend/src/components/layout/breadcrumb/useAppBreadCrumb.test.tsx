import { ROLES } from '@sirena/common/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUserById } from '@/lib/api/fetchUsers';
import { useListStateStore } from '@/stores/listStateStore';
import { useUserStore } from '@/stores/userStore';
import { useAppBreadCrumb } from './useAppBreadCrumb';

vi.mock('@tanstack/react-router', () => ({
  useMatches: ({ select }: { select: (matches: unknown[]) => unknown }) =>
    select([{ routeId: '/_auth/admin/user/$userId', params: { userId: 'u1' } }]),
}));

vi.mock('@/lib/api/fetchUsers', () => ({
  fetchUserById: vi.fn(),
  fetchUsers: vi.fn(),
}));

let queryClient: QueryClient;

const renderBreadCrumb = () =>
  renderHook(() => useAppBreadCrumb(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }).result.current;

describe('useAppBreadCrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    useUserStore.setState({ role: ROLES.SUPER_ADMIN });
    useListStateStore.setState({ states: {} });
  });

  it('leads a pending account reached by direct URL back to the access requests tab', () => {
    queryClient.setQueryData(['user', 'u1'], { id: 'u1', roleId: ROLES.PENDING });

    expect(renderBreadCrumb()?.[1]).toMatchObject({ text: "Demandes d'habilitation", to: '/admin/users' });
  });

  it('reads the edited user from the cache without fetching it', () => {
    expect(renderBreadCrumb()?.[1]).toMatchObject({ text: 'Utilisateurs', to: '/admin/users/all' });
    expect(fetchUserById).not.toHaveBeenCalled();
  });
});
