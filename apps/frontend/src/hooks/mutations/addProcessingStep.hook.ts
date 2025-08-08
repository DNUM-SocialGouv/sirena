import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AddProcessingStepData, addProcessingStep } from '@/lib/api/processingSteps';

export const useAddProcessingStep = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddProcessingStepData) => addProcessingStep(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
