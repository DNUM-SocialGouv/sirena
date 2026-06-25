import type { RequeteEtapeStatutType } from '@sirena/common/constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type AddClotureFilesData,
  type AddProcessingStepData,
  type AddProcessingStepNoteData,
  addClotureFiles,
  addProcessingStep,
  addProcessingStepNote,
  deleteProcessingStep,
  deleteProcessingStepNote,
  sendAcknowledgment,
  type UpdateProcessingStepData,
  type UpdateProcessingStepNoteData,
  updateProcessingStep,
  updateProcessingStepNote,
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

type AddProcessingStepNoteDataParams = {
  id: string;
} & AddProcessingStepNoteData;

export const useAddProcessingStepNote = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, texte, fileIds }: AddProcessingStepNoteDataParams) =>
      addProcessingStepNote(id, { texte, fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

type UpdateProcessingStepNoteDataParams = {
  noteId: string;
} & UpdateProcessingStepNoteData;

export const useUpdateProcessingStepNote = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, texte, fileIds }: UpdateProcessingStepNoteDataParams) =>
      updateProcessingStepNote(noteId, { texte, fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

type DeleteProcessingStepNoteDataParams = {
  id: string;
  noteId: string;
};

export const useDeleteProcessingStepNote = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId }: DeleteProcessingStepNoteDataParams) => deleteProcessingStepNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps', requestId] });
    },
  });
};

type UpdateProcessingStepStatusParams = {
  id: string;
  statutId: Exclude<RequeteEtapeStatutType, 'CLOTUREE'>;
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
