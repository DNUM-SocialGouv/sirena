import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessingStepDateRealisation } from '@/lib/api/processingSteps';

export type UpdateProcessingStepDateRealisationParams = {
  id: string;
  dateRealisation: string;
};

export const useUpdateProcessingStepDateRealisation = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dateRealisation }: UpdateProcessingStepDateRealisationParams) => {
      return updateProcessingStepDateRealisation(id, { dateRealisation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
