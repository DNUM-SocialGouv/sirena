import { FEATURE_FLAGS } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { requireAdminLocalDirectionCreation, requireAdminLocalServiceCreation } from './-create-route-guard';

const { authGuardSpy, redirectSpy } = vi.hoisted(() => ({
  authGuardSpy: vi.fn(),
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  redirect: redirectSpy,
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => authGuardSpy),
}));

vi.mock('@/lib/api/fetchEntites', () => ({
  fetchDirectionsServicesList: vi.fn(),
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
    fetchQuery: vi.fn(),
  },
}));

const enabledFlags = {
  [FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(queryClient.ensureQueryData).mockResolvedValue(enabledFlags);
});

describe('Admin local Direction and Service creation route guards', () => {
  it('allows the Direction add route when the assigned perimeter can create Directions', async () => {
    vi.mocked(queryClient.fetchQuery).mockResolvedValue({
      capabilities: { canCreateDirection: true, canCreateService: true },
    });

    await expect(requireAdminLocalDirectionCreation({} as never)).resolves.toBeUndefined();

    expect(authGuardSpy).toHaveBeenCalled();
  });

  it('redirects Direction- and Service-level perimeters away from the Direction add route', async () => {
    vi.mocked(queryClient.fetchQuery).mockResolvedValue({
      capabilities: { canCreateDirection: false, canCreateService: true },
    });

    await expect(requireAdminLocalDirectionCreation({} as never)).rejects.toEqual({
      redirect: { to: '/admin/directions-services' },
    });
  });

  it('allows the Service add route for root and Direction perimeters with an authorized active Direction', async () => {
    vi.mocked(queryClient.fetchQuery).mockResolvedValue({
      capabilities: { canCreateDirection: false, canCreateService: true },
    });

    await expect(requireAdminLocalServiceCreation({} as never)).resolves.toBeUndefined();
  });

  it('redirects Service-level or inactive Direction perimeters away from the Service add route', async () => {
    vi.mocked(queryClient.fetchQuery).mockResolvedValue({
      capabilities: { canCreateDirection: false, canCreateService: false },
    });

    await expect(requireAdminLocalServiceCreation({} as never)).rejects.toEqual({
      redirect: { to: '/admin/directions-services' },
    });
  });
});
