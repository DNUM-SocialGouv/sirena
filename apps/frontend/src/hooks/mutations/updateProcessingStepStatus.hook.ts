import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessingStepStatus } from '@/lib/api/processingSteps';

type UpdateProcessingStepStatusParams = {
  id: string;
  statutId: 'A_FAIRE' | 'EN_COURS' | 'FAIT';
};

export const useUpdateProcessingStepStatus = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, statutId }: UpdateProcessingStepStatusParams) => {
      return updateProcessingStepStatus(id, { statutId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
