import type { RequeteStatutType } from '@sirena/common/constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type AddProcessingStepData,
  type AddProcessingStepNoteData,
  addProcessingStep,
  addProcessingStepNote,
  updateProcessingStepStatus,
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

type AddProcessingStepNoteDataParams = {
  id: string;
} & AddProcessingStepNoteData;

export const useAddProcessingStepNote = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content, fileIds }: AddProcessingStepNoteDataParams) =>
      addProcessingStepNote(id, { content, fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

type UpdateProcessingStepStatusParams = {
  id: string;
  statutId: RequeteStatutType;
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
