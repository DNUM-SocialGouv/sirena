import { useQuery } from '@tanstack/react-query';
import { fetchStatutCounts } from '@/lib/api/fetchStatutCounts';

type StatutCountsParams = {
  statutIds: string;
  entiteId?: string;
  search?: string;
  enabled?: boolean;
};

export const useStatutCounts = ({ enabled = true, ...params }: StatutCountsParams) =>
  useQuery({
    queryKey: ['statutCounts', params],
    queryFn: () => fetchStatutCounts(params),
    enabled: enabled && !!params.statutIds,
  });
