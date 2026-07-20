import { FEATURE_FLAGS } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { queryClient } from '@/lib/queryClient';
import { requireAdminLocalDirectionsServices } from './-route-guard';

const { authGuardSpy, redirectSpy } = vi.hoisted(() => ({
  authGuardSpy: vi.fn(),
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  redirect: redirectSpy,
}));
vi.mock('@/lib/auth-guards', () => ({ requireAuthAndRoles: vi.fn(() => authGuardSpy) }));
vi.mock('@/lib/api/fetchFeatureFlags', () => ({ fetchResolvedFeatureFlags: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { ensureQueryData: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('local Directions and Services route guard', () => {
  it('requires the entity-admin role and allows an enabled feature', async () => {
    vi.mocked(queryClient.ensureQueryData).mockResolvedValue({
      [FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]: true,
    });

    await expect(
      requireAdminLocalDirectionsServices({ location: { href: '/admin/directions-services' } } as never),
    ).resolves.toBeUndefined();

    expect(authGuardSpy).toHaveBeenCalled();
    expect(queryClient.ensureQueryData).toHaveBeenCalledWith({
      queryKey: ['featureFlags', 'resolved'],
      queryFn: fetchResolvedFeatureFlags,
    });
  });

  it('redirects to admin users when the feature is disabled', async () => {
    vi.mocked(queryClient.ensureQueryData).mockResolvedValue({
      [FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]: false,
    });

    await expect(requireAdminLocalDirectionsServices({ location: { href: '' } } as never)).rejects.toEqual({
      redirect: { to: '/admin/users' },
    });
  });
});
