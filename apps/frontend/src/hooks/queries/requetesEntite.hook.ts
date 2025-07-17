import { useQuery } from '@tanstack/react-query';
import { fetchRequetesEntite } from '@/lib/api/fetchRequetesEntite';
import type { QueryParams } from '@/types/pagination.type.ts';

export const useRequetesEntite = (query?: QueryParams) =>
  useQuery({
    queryKey: ['requetesEntite', query],
    queryFn: () => fetchRequetesEntite(query || {}),
    initialData: { data: [], meta: { total: 0 } },
  });
