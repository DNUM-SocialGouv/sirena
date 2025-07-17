import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '@/lib/api/fetchProfile';

export const profileQueryOptions = () => ({
  queryKey: ['profile'],
  queryFn: () => fetchProfile(),
  retry: false,
});

export const useProfile = () => useQuery(profileQueryOptions());
