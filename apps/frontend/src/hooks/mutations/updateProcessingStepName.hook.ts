import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessingStepName } from '@/lib/api/processingSteps';

type UpdateProcessingStepNameParams = {
  id: string;
  stepName: string;
};

export const useUpdateProcessingStepName = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stepName }: UpdateProcessingStepNameParams) => {
      return updateProcessingStepName(id, { stepName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
