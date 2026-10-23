import { describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { useUserStore } from '@/stores/userStore';
import { fetchProfile } from './fetchProfile';

vi.mock('@/lib/api/hc', () => ({
  client: { profile: { $get: vi.fn() } },
}));

vi.mock('@/lib/api/tanstackQuery', () => ({ handleRequestErrors: vi.fn() }));

vi.mock('@/lib/sentryUser', () => ({ identifySentryUser: vi.fn() }));

describe('fetchProfile', () => {
  it('keeps the accepted CGU version in the user store', async () => {
    const $get = vi.mocked(client.profile.$get);
    const profile = {
      id: 'user-1',
      email: 'user@example.com',
      roleId: 'READER',
      statutId: 'ACTIF',
      topEntiteId: null,
      cguAcceptedVersion: '2026-10-20',
    };
    $get.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ data: profile }) } as unknown as Awaited<
      ReturnType<typeof $get>
    >);

    await fetchProfile();

    expect(useUserStore.getState().cguAcceptedVersion).toBe('2026-10-20');
  });
});
