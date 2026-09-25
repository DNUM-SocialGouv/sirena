import { type InfiniteData, type QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fetchRequeteMessages } from '@/lib/api/requeteMessages';

export const requeteMessagesQueryKey = (requestId: string) => ['requeteMessages', requestId] as const;

export const useRequeteMessages = (requestId: string, enabled = true) =>
  useInfiniteQuery({
    queryKey: requeteMessagesQueryKey(requestId),
    queryFn: ({ pageParam }) => fetchRequeteMessages(requestId, { before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled: enabled && !!requestId,
  });

type RequeteMessagesPage = Awaited<ReturnType<typeof fetchRequeteMessages>>;

export type RequeteMessage = RequeteMessagesPage['data'][number];

type RequeteMessagesCache = InfiniteData<RequeteMessagesPage, string | undefined>;

// Pages are newest first, and so are the messages inside a page.
const findNewestMessageId = (cache: RequeteMessagesCache | undefined): string | undefined => {
  const page = cache?.pages.find(({ data }) => data.length > 0);
  if (!page) return undefined;
  const [newest] = page.data;
  return newest?.id;
};

const prependMessages = (cache: RequeteMessagesCache, incoming: RequeteMessage[]): RequeteMessagesCache => {
  const [firstPage, ...otherPages] = cache.pages;
  if (!firstPage) return cache;

  const knownIds = new Set(cache.pages.flatMap((page) => page.data.map((message) => message.id)));
  const fresh = incoming.filter((message) => !knownIds.has(message.id));
  if (fresh.length === 0) return cache;

  return { ...cache, pages: [{ ...firstPage, data: [...fresh, ...firstPage.data] }, ...otherPages] };
};

export const appendNewerMessages = async (queryClient: QueryClient, requestId: string): Promise<void> => {
  const queryKey = requeteMessagesQueryKey(requestId);
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const newestId = findNewestMessageId(queryClient.getQueryData<RequeteMessagesCache>(queryKey));
  if (!newestId) return invalidate();

  let page: RequeteMessagesPage;
  try {
    page = await fetchRequeteMessages(requestId, { after: newestId }, { silentToastError: true });
  } catch {
    return invalidate();
  }

  if (page.meta.hasMore) return invalidate();

  queryClient.setQueryData<RequeteMessagesCache>(queryKey, (cache) =>
    cache ? prependMessages(cache, page.data) : cache,
  );
};
