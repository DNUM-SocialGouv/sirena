import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type UpdateStatutData, updateStatut } from '@/lib/api/fetchRequetesEntite';

export const useUpdateStatut = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStatutData) => updateStatut(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requete', requestId] });
    },
  });
};
