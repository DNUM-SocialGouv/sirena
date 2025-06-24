import { fetchProfile } from '@/lib/api/fetchProfile';
import { useQuery } from '@tanstack/react-query';

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: () => fetchProfile(),
    retry: false,
  });
