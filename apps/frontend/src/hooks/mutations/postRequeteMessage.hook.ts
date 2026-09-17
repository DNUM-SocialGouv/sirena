import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requeteMessagesQueryKey } from '@/hooks/queries/requeteMessages.hook';
import { requeteUnreadCountQueryKey } from '@/hooks/queries/requeteMessagesUnread.hook';
import { type PostRequeteMessageData, postRequeteMessage } from '@/lib/api/requeteMessages';

export const usePostRequeteMessage = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PostRequeteMessageData) => postRequeteMessage(requestId, data),
    onSuccess: async () => {
      queryClient.setQueryData(requeteUnreadCountQueryKey(requestId), 0);
      await queryClient.invalidateQueries({ queryKey: requeteMessagesQueryKey(requestId) });
    },
  });
};
