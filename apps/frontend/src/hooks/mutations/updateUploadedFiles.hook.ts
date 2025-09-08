import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUploadedFile, uploadFile } from '@/lib/api/fetchUploadedFiles';
import type { RequestErrorOptions } from '@/lib/api/tanstackQuery';

export const useUploadFile = (options: Partial<RequestErrorOptions> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadFile(file, options),
    onSuccess: (data) => {
      queryClient.setQueryData(['uploaded-files'], data);
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });
};

export const useDeleteUploadedFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUploadedFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });
};
