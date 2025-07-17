import { useQuery } from '@tanstack/react-query';
import { fetchRoles } from '@/lib/api/fetchRoles';

export const useRoles = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles(),
  });
