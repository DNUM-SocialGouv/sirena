import { useQuery } from '@tanstack/react-query';
import { fetchVersion } from '@/lib/api/fetchVersion';

export const versionQueryOptions = () => ({
  queryKey: ['version'],
  queryFn: () => fetchVersion(),
  retry: false,
});

export const useVersion = () => useQuery(versionQueryOptions());
