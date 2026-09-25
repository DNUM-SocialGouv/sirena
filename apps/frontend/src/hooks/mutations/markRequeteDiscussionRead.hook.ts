import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requeteMessagesQueryKey } from '@/hooks/queries/requeteMessages.hook';
import { requeteUnreadCountQueryKey } from '@/hooks/queries/requeteMessagesUnread.hook';
import { markRequeteDiscussionRead } from '@/lib/api/requeteMessages';

export const useMarkRequeteDiscussionRead = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markRequeteDiscussionRead(requestId),
    onSuccess: () => {
      // The count that comes back is the one computed by the transaction: a message posted right after it
      // would be lost if it were written to the cache, so the query is refetched instead.
      queryClient.invalidateQueries({ queryKey: requeteUnreadCountQueryKey(requestId) });
      queryClient.invalidateQueries({ queryKey: requeteMessagesQueryKey(requestId) });
    },
  });
};
