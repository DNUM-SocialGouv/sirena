import { useQuery } from '@tanstack/react-query';
import { fetchDematSocialMappingById, fetchDematSocialMappings } from '@/lib/api/fetchDematSocialMappings';
import type { QueryParams } from '@/types/pagination.type.ts';

export const useDematSocialMappingsQueryOptions = (query: QueryParams = {}) => ({
  queryKey: ['dematSocialMappings', query],
  queryFn: () => fetchDematSocialMappings(query),
  retry: false,
  initialData: { data: [], meta: { total: 0 } },
});

export const useDematSocialMappings = (query: QueryParams = {}) => useQuery(useDematSocialMappingsQueryOptions(query));

export const useDematSocialMappingQueryOptions = (id: string) => ({
  queryKey: ['dematSocialMapping', id],
  queryFn: () => fetchDematSocialMappingById(id),
  retry: false,
});

export const useDematSocialMapping = (id: string) => useQuery(useDematSocialMappingQueryOptions(id));
