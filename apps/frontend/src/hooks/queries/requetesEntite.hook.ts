import { useQuery } from '@tanstack/react-query';
import { fetchRequetesEntite } from '@/lib/api/fetchRequetesEntite';
import type { QueryParams } from '@/types/pagination.type.ts';

type ReuqeteEntiteQueryParams = QueryParams & {
  entiteId?: string;
};

export const useRequetesEntite = (query?: ReuqeteEntiteQueryParams) =>
  useQuery({
    queryKey: ['requetesEntite', query],
    queryFn: () => fetchRequetesEntite(query || {}),
  });
