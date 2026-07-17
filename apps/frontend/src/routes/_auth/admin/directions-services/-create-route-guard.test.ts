import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { requireAdminLocalDirectionCreation, requireAdminLocalServiceCreation } from './-create-route-guard';
import { requireAdminLocalDirectionsServices } from './-route-guard';

const { redirectSpy } = vi.hoisted(() => ({
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  redirect: redirectSpy,
}));
vi.mock('./-route-guard', () => ({ requireAdminLocalDirectionsServices: vi.fn() }));
vi.mock('@/lib/api/fetchEntites', () => ({ fetchDirectionsServicesList: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { fetchQuery: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('local creation capability guards', () => {
  it.each([
    ['Direction', requireAdminLocalDirectionCreation, { canCreateDirection: true, canCreateService: false }],
    ['Service', requireAdminLocalServiceCreation, { canCreateDirection: false, canCreateService: true }],
  ] as const)('allows %s creation when its backend capability is enabled', async (_name, guard, capabilities) => {
    vi.mocked(queryClient.fetchQuery).mockResolvedValue({ capabilities });

    await expect(guard({} as never)).resolves.toBeUndefined();
    expect(requireAdminLocalDirectionsServices).toHaveBeenCalled();
  });

  it.each([
    ['Direction', requireAdminLocalDirectionCreation, { canCreateDirection: false, canCreateService: true }],
    ['Service', requireAdminLocalServiceCreation, { canCreateDirection: true, canCreateService: false }],
  ] as const)('redirects when %s creation capability is disabled', async (_name, guard, capabilities) => {
    vi.mocked(queryClient.fetchQuery).mockResolvedValue({ capabilities });

    await expect(guard({} as never)).rejects.toEqual({ redirect: { to: '/admin/directions-services' } });
  });
});
