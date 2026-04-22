import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type EditEntiteAdminInput,
  editEntiteAdmin,
  fetchEntiteByIdAdmin,
  fetchEntiteChain,
  fetchEntiteDescendants,
  fetchEntites,
  fetchEntitesListAdmin,
} from '@/lib/api/fetchEntites';
import type { QueryParams } from '@/types/pagination.type.ts';

export const useEntitesQueryOptions = (id: string | undefined, query: QueryParams = {}) => ({
  queryKey: id ? ['entites', id, query] : ['entites', query],
  queryFn: () => fetchEntites(id, query),
  retry: false,
  initialData: { data: [], meta: { total: 0 } },
});

export const useEntites = (id: string | undefined, query: QueryParams = {}) =>
  useQuery(useEntitesQueryOptions(id, query));

export const useEntitesListAdminQueryOptions = (query: QueryParams = {}) => ({
  queryKey: ['entites', 'admin', query],
  queryFn: () => fetchEntitesListAdmin(query),
  retry: false,
  initialData: { data: [], meta: { total: 0 } },
});

export const useEntitesListAdmin = (query: QueryParams = {}) => useQuery(useEntitesListAdminQueryOptions(query));

export const useEntiteByIdAdmin = (entiteId: string) =>
  useQuery({
    queryKey: ['entite', 'admin', entiteId],
    queryFn: () => fetchEntiteByIdAdmin(entiteId),
    retry: false,
  });

export const useEntiteChainQueryOptions = (id: string | undefined) => ({
  queryKey: ['entiteChain', id],
  queryFn: () => fetchEntiteChain(id),
  retry: false,
});

export const useEntiteChain = (id: string | undefined) => useQuery(useEntiteChainQueryOptions(id));

export const useEntiteDescendantsQueryOptions = (id: string | undefined) => ({
  queryKey: ['entiteDescendants', id],
  queryFn: () => {
    if (!id) return [];
    return fetchEntiteDescendants(id);
  },
  retry: false,
  enabled: !!id,
});

export const useEntiteDescendants = (id: string | undefined) => useQuery(useEntiteDescendantsQueryOptions(id));

export const useEditEntiteAdmin = () =>
  useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditEntiteAdminInput }) => editEntiteAdmin(id, input),
  });
