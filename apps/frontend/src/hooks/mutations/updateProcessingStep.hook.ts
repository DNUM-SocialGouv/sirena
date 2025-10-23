import type { RequeteStatutType } from '@sirena/common/constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type AddProcessingStepData,
  type AddProcessingStepNoteData,
  addProcessingStep,
  addProcessingStepNote,
  deleteProcessingStep,
  deleteProcessingStepNote,
  type UpdateProcessingStepNoteData,
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
  statutId: Exclude<RequeteStatutType, 'CLOTUREE'>;
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
