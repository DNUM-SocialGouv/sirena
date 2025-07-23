import { useQuery } from '@tanstack/react-query';
import { fetchDematSocialMappingById, fetchDematSocialMappings } from '@/lib/api/fetchDematSocialMappings';
import type { QueryParams } from '@/types/pagination.type.ts';

type FetchDematSocialMappingsReturn = Awaited<ReturnType<typeof fetchDematSocialMappings>>;

export const useDematSocialMappingsQueryOptions = (query: QueryParams = {}) => ({
  queryKey: ['dematSocialMappings', query],
  queryFn: () => fetchDematSocialMappings(query),
  retry: false,
});

export const useDematSocialMappings = (query: QueryParams = {}) =>
  useQuery<FetchDematSocialMappingsReturn>(useDematSocialMappingsQueryOptions(query));

export const useDematSocialMappingQueryOptions = (id: string) => ({
  queryKey: ['dematSocialMapping', id],
  queryFn: () => fetchDematSocialMappingById(id),
  retry: false,
});

export const useDematSocialMapping = (id: string) => useQuery(useDematSocialMappingQueryOptions(id));
