import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUploadedFile, uploadFile } from '@/lib/api/fetchUploadedFiles';
import type { RequestErrorOptions } from '@/lib/api/tanstackQuery';

export const useUploadFile = (options: Partial<RequestErrorOptions> = {}) =>
  useMutation({
    mutationFn: (file: File) => uploadFile(file, options),
  });

type DeleteUploadedFileOptions = {
  requeteId?: string;
};

export const useDeleteUploadedFile = (options: DeleteUploadedFileOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUploadedFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingSteps'] });
      if (options.requeteId) {
        queryClient.invalidateQueries({ queryKey: ['requete', options.requeteId] });
      }
    },
  });
};
