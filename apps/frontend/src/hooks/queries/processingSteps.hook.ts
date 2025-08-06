import { useQuery } from '@tanstack/react-query';
import { fetchProcessingSteps } from '@/lib/api/processingSteps';

export const useProcessingSteps = (requestId: string) => {
  return useQuery({
    queryKey: ['processingSteps', requestId],
    queryFn: () => fetchProcessingSteps(requestId),
  });
};
