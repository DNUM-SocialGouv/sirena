import { fetchProfile } from '@/lib/api/fetchProfile';
import { useQuery } from '@tanstack/react-query';

export const profileQueryOptions = () => ({
  queryKey: ['profile'],
  queryFn: () => fetchProfile(),
  retry: false,
});

export const useProfile = () => useQuery(profileQueryOptions());
