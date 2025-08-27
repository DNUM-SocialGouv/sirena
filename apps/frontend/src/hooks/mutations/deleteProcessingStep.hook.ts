import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProcessingStep } from '@/lib/api/processingSteps';

type DeleteProcessingStepParams = {
  id: string;
};

export const useDeleteProcessingStep = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteProcessingStepParams) => {
      return deleteProcessingStep(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
