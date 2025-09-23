import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessingStepName } from '@/lib/api/processingSteps';

export type UpdateProcessingStepNameParams = {
  id: string;
  nom: string;
};

export const useUpdateProcessingStepName = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nom }: UpdateProcessingStepNameParams) => {
      return updateProcessingStepName(id, { nom });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
