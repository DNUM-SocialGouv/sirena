import { useQuery } from '@tanstack/react-query';
import { fetchDepartementCounts } from '@/lib/api/fetchDepartementCounts';

type DepartementCountsParams = {
  departementCodes: string;
  entiteId?: string;
  search?: string;
  enabled?: boolean;
};

export const useDepartementCounts = ({ enabled = true, ...params }: DepartementCountsParams) =>
  useQuery({
    queryKey: ['departementCounts', params],
    queryFn: () => fetchDepartementCounts(params),
    enabled: enabled && !!params.departementCodes,
  });
