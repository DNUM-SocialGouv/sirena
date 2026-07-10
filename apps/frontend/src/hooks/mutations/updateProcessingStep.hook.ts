import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type AddClotureFilesData,
  type AddProcessingStepData,
  addClotureFiles,
  addProcessingStep,
  deleteProcessingStep,
  sendAcknowledgment,
  type UpdateProcessingStepData,
  updateProcessingStep,
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

type UpdateProcessingStepParams = {
  id: string;
} & UpdateProcessingStepData;

export const useUpdateProcessingStep = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProcessingStepParams) => updateProcessingStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

type AddClotureFilesDataParams = {
  stepId: string;
} & AddClotureFilesData;

export const useAddClotureFiles = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepId, fileIds }: AddClotureFilesDataParams) => addClotureFiles(stepId, { fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

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

type SendAcknowledgmentParams = {
  id: string;
  comment?: string;
};

export const useSendAcknowledgment = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: SendAcknowledgmentParams) => sendAcknowledgment(id, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};
