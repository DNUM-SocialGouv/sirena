import { useQuery } from '@tanstack/react-query';
import { fetchDomaineCounts } from '@/lib/api/fetchDomaineCounts';

type DomaineCountsParams = {
  domaineIds: string;
  entiteId?: string;
  search?: string;
  enabled?: boolean;
};

export const useDomaineCounts = ({ enabled = true, ...params }: DomaineCountsParams) =>
  useQuery({
    queryKey: ['domaineCounts', params],
    queryFn: () => fetchDomaineCounts(params),
    enabled: enabled && !!params.domaineIds,
  });
