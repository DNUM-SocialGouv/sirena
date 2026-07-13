import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { Route, RouteComponent } from './directions.create';

const { authGuardSpy, redirectSpy } = vi.hoisted(() => ({
  authGuardSpy: vi.fn(),
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  redirect: redirectSpy,
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => authGuardSpy),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Direction create route', () => {
  it('restricts the route to entity admins', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBeTypeOf('function');
  });

  it('redirects to admin users from beforeLoad when the feature flag is disabled', async () => {
    vi.mocked(queryClient.ensureQueryData).mockResolvedValueOnce({
      [FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]: false,
    });

    await expect(
      (Route as unknown as { beforeLoad: (ctx: unknown) => Promise<void> }).beforeLoad({ location: { href: '' } }),
    ).rejects.toEqual({ redirect: { to: '/admin/users' } });
    expect(fetchResolvedFeatureFlags).not.toHaveBeenCalled();
  });

  it('renders the Direction-specific creation title and local return link', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Créer une direction' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Directions et services/ })).toHaveAttribute(
      'href',
      '/admin/directions-services',
    );
    expect(document.title).toBe('Créer une direction - Directions et services - SIRENA');
  });
});
