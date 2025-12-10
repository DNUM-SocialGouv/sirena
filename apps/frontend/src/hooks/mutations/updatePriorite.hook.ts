import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type UpdatePrioriteData, updatePriorite } from '@/lib/api/fetchRequetesEntite.ts';

export const useUpdatePriorite = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePrioriteData) => updatePriorite(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requete', requestId] });
    },
  });
};
