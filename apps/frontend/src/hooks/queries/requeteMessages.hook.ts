import { useInfiniteQuery } from '@tanstack/react-query';
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
