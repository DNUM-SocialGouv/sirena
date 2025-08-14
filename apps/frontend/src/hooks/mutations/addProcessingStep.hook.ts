import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type AddProcessingStepData,
  type AddProcessingStepNoteData,
  addProcessingStep,
  addProcessingStepNote,
} from '@/lib/api/processingSteps';

export const useAddProcessingStep = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddProcessingStepData) => addProcessingStep(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

export const useAddProcessingStepNote = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddProcessingStepNoteData) => addProcessingStepNote(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
