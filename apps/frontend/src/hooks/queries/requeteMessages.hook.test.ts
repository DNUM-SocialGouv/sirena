import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendNewerMessages, requeteMessagesQueryKey } from './requeteMessages.hook';

const { fetchRequeteMessages } = vi.hoisted(() => ({ fetchRequeteMessages: vi.fn() }));

vi.mock('@/lib/api/requeteMessages', () => ({ fetchRequeteMessages }));

const REQUEST_ID = 'REQ-1';
const KEY = requeteMessagesQueryKey(REQUEST_ID);

const makeMessage = (id: string) => ({
  id,
  requeteId: REQUEST_ID,
  contenu: `Message ${id}`,
  createdAt: '2026-01-01T10:00:00.000Z',
  entite: { id: 'E1', nomComplet: 'ARS', entiteTypeId: 'ARS' },
  author: null,
  isReadByCurrentUser: true,
});

const page = (ids: string[], hasMore = false) => ({
  data: ids.map(makeMessage),
  meta: { hasMore, nextCursor: hasMore ? ids.at(-1) : null },
});

const cache = (pages: ReturnType<typeof page>[]) => ({ pages, pageParams: pages.map(() => undefined) });

const setup = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const cachedIds = () =>
    queryClient.getQueryData<ReturnType<typeof cache>>(KEY)?.pages.map((p) => p.data.map((m) => m.id));
  return { queryClient, invalidateQueries, cachedIds };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('appendNewerMessages', () => {
  it('invalidates without fetching when nothing is cached', async () => {
    const { queryClient, invalidateQueries } = setup();

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(fetchRequeteMessages).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: KEY });
  });

  it('invalidates without fetching when every cached page is empty', async () => {
    const { queryClient, invalidateQueries } = setup();
    queryClient.setQueryData(KEY, cache([page([])]));

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(fetchRequeteMessages).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: KEY });
  });

  it('uses the first non-empty page to find the newest message', async () => {
    const { queryClient, invalidateQueries, cachedIds } = setup();
    queryClient.setQueryData(KEY, cache([page([]), page(['M2', 'M1'])]));
    fetchRequeteMessages.mockResolvedValueOnce(page(['M3']));

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(fetchRequeteMessages).toHaveBeenCalledWith(REQUEST_ID, { after: 'M2' }, { silentToastError: true });
    expect(cachedIds()).toEqual([['M3'], ['M2', 'M1']]);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('skips messages already present in any cached page', async () => {
    const { queryClient, cachedIds } = setup();
    queryClient.setQueryData(KEY, cache([page(['M3', 'M2'], true), page(['M1'])]));
    fetchRequeteMessages.mockResolvedValueOnce(page(['M4', 'M3', 'M1']));

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(cachedIds()).toEqual([['M4', 'M3', 'M2'], ['M1']]);
  });

  it('leaves the cache untouched when nothing new came back', async () => {
    const { queryClient } = setup();
    const initial = cache([page(['M1'])]);
    queryClient.setQueryData(KEY, initial);
    fetchRequeteMessages.mockResolvedValueOnce(page([]));

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(queryClient.getQueryData(KEY)).toBe(initial);
  });

  it('does nothing when the cache was dropped while fetching', async () => {
    const { queryClient, invalidateQueries } = setup();
    queryClient.setQueryData(KEY, cache([page(['M1'])]));
    fetchRequeteMessages.mockImplementationOnce(async () => {
      queryClient.removeQueries({ queryKey: KEY });
      return page(['M2']);
    });

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(queryClient.getQueryData(KEY)).toBeUndefined();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it.each([
    ['the catch-up is incomplete', () => fetchRequeteMessages.mockResolvedValueOnce(page(['M2'], true))],
    ['the request fails', () => fetchRequeteMessages.mockRejectedValueOnce(new Error('network'))],
  ])('falls back to a full invalidation when %s', async (_label, arrange) => {
    const { queryClient, invalidateQueries, cachedIds } = setup();
    queryClient.setQueryData(KEY, cache([page(['M1'])]));
    arrange();

    await appendNewerMessages(queryClient, REQUEST_ID);

    expect(cachedIds()).toEqual([['M1']]);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: KEY });
  });
});
