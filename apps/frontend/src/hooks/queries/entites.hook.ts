import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type CreateChildEntiteAdminInput,
  type CreateDirectionAdminLocalInput,
  createChildEntiteAdmin,
  createDirectionAdminLocal,
  type EditEntiteAdminInput,
  editEntiteAdmin,
  fetchDirectionsServicesList,
  fetchEntiteByIdAdmin,
  fetchEntiteChain,
  fetchEntiteDescendants,
  fetchEntites,
  fetchEntitesListAdmin,
  fetchRootEntitesListAdmin,
} from '@/lib/api/fetchEntites';
import { queryClient } from '@/lib/queryClient';
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

export const useRootEntitesListAdminQueryOptions = () => ({
  queryKey: ['entites', 'admin', 'roots'],
  queryFn: () => fetchRootEntitesListAdmin(),
  retry: false,
  initialData: { data: [] },
});

export const useRootEntitesListAdmin = () => useQuery(useRootEntitesListAdminQueryOptions());

export const useDirectionsServicesListQueryOptions = (query: Pick<QueryParams, 'search'> = {}) => ({
  queryKey: ['entites', 'admin', 'directions-services', query],
  queryFn: () => fetchDirectionsServicesList(query),
  retry: false,
  initialData: { data: [], capabilities: { canCreateDirection: false, canCreateService: false } },
});

export const useDirectionsServicesList = (query: Pick<QueryParams, 'search'> = {}) =>
  useQuery(useDirectionsServicesListQueryOptions(query));

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
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['entite', 'admin', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['entites'] });
    },
  });

export const useCreateChildEntiteAdmin = () =>
  useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateChildEntiteAdminInput }) =>
      createChildEntiteAdmin(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entites'] });
    },
  });

export const useCreateDirectionAdminLocal = () =>
  useMutation({
    mutationFn: (input: CreateDirectionAdminLocalInput) => createDirectionAdminLocal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entites', 'admin', 'directions-services'] });
    },
  });
