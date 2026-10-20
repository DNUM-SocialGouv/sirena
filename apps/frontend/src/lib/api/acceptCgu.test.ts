import { beforeEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import { acceptCgu } from './acceptCgu';

vi.mock('@/lib/api/hc', () => ({
  client: { profile: { 'cgu-acceptance': { $post: vi.fn() } } },
}));

vi.mock('@/lib/api/tanstackQuery', () => ({ handleRequestErrors: vi.fn() }));

describe('acceptCgu', () => {
  const $post = vi.mocked(client.profile['cgu-acceptance'].$post);

  beforeEach(() => {
    vi.mocked(handleRequestErrors).mockResolvedValue(undefined);
  });

  it('sends the accepted version and returns the recorded acceptance', async () => {
    const acceptance = { cguAcceptedVersion: '2026-10-20', cguAcceptedAt: '2026-10-20T08:30:00.000Z' };
    const res = { json: vi.fn().mockResolvedValue({ data: acceptance }) };
    $post.mockResolvedValueOnce(res as unknown as Awaited<ReturnType<typeof $post>>);

    await expect(acceptCgu('2026-10-20')).resolves.toEqual(acceptance);

    expect($post).toHaveBeenCalledWith({ json: { version: '2026-10-20' } });
    // The modal shows its own message, no toast on top of it
    expect(handleRequestErrors).toHaveBeenCalledWith(res, { silentToastError: true });
  });
});
