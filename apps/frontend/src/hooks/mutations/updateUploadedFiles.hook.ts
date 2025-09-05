import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '@/lib/api/fetchUploadedFiles';

export const useUploadFile = (options?: { silentToastError?: boolean }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadFile(file, options),
    onSuccess: (data) => {
      queryClient.setQueryData(['uploaded-files'], data);
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });
};
