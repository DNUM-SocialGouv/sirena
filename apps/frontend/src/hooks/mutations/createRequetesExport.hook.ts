import { useMutation, useQueryClient } from '@tanstack/react-query';
import { REQUETES_EXPORT_STATUS_QUERY_KEY } from '@/hooks/queries/statistics.hook';
import { createRequetesExport } from '@/lib/api/fetchStatistics';

export const useCreateRequetesExport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequetesExport,
    onSettled: () => queryClient.invalidateQueries({ queryKey: REQUETES_EXPORT_STATUS_QUERY_KEY }),
  });
};
