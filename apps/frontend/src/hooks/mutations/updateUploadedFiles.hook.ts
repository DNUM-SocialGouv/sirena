import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '@/lib/api/fetchUploadedFiles';

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (data) => {
      queryClient.setQueryData(['uploaded-files'], data);
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });
};
