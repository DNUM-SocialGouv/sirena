import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requeteMessagesQueryKey } from '@/hooks/queries/requeteMessages.hook';
import { requeteUnreadCountQueryKey } from '@/hooks/queries/requeteMessagesUnread.hook';
import { type PostRequeteMessageData, postRequeteMessage } from '@/lib/api/requeteMessages';

export const usePostRequeteMessage = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PostRequeteMessageData) => postRequeteMessage(requestId, data),
    onSuccess: async () => {
      // Not setQueryData(0): a message can land between the server marking the thread read and this
      // answer, and forcing zero would hide it until the next refresh.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: requeteUnreadCountQueryKey(requestId) }),
        queryClient.invalidateQueries({ queryKey: requeteMessagesQueryKey(requestId) }),
      ]);
    },
  });
};
