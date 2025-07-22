import { useQuery } from '@tanstack/react-query';
import { fetchVersion } from '@/lib/api/fetchVersion';

export const versionQueryOptions = () => ({
  queryKey: ['version'],
  queryFn: () => fetchVersion(),
  retry: false,
  staleTime: 1000 * 60 * 5, // 5 minutes
});

export const useVersion = () => useQuery(versionQueryOptions());
