import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reopenRequete } from '@/lib/api/fetchRequetesEntite.ts';

export const useReopenRequete = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reopenRequete(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
      queryClient.invalidateQueries({ queryKey: ['requete', requestId] });
    },
  });
};
