import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requeteMessagesQueryKey } from '@/hooks/queries/requeteMessages.hook';
import { markRequeteDiscussionRead } from '@/lib/api/requeteMessages';

export const useMarkRequeteDiscussionRead = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markRequeteDiscussionRead(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requeteMessagesQueryKey(requestId) });
    },
  });
};
