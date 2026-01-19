import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CloseRequeteData, closeRequete } from '@/lib/api/fetchRequetesEntite.ts';

export const useCloseRequete = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CloseRequeteData) => closeRequete(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
      queryClient.invalidateQueries({ queryKey: ['requete', requestId] });
    },
  });
};
