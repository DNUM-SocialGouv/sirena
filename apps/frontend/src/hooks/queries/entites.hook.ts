import { useQuery } from '@tanstack/react-query';
import { fetchEntiteChain, fetchEntites } from '@/lib/api/fetchEntites';
import type { QueryParams } from '@/types/pagination.type.ts';

export const useEntitesQueryOptions = (id: string | undefined, query: QueryParams = {}) => ({
  queryKey: id ? ['entites', id, query] : ['entites', query],
  queryFn: () => fetchEntites(id, query),
  retry: false,
  initialData: { data: [], meta: { total: 0 } },
});

export const useEntites = (id: string | undefined, query: QueryParams = {}) =>
  useQuery(useEntitesQueryOptions(id, query));

export const useEntiteChainQueryOptions = (id: string | undefined) => ({
  queryKey: ['entiteChain', id],
  queryFn: () => fetchEntiteChain(id),
  retry: false,
});

export const useEntiteChain = (id: string | undefined) => useQuery(useEntiteChainQueryOptions(id));
