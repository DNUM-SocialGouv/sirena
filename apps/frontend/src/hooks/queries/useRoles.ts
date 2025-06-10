import { fetchRoles } from '@/lib/api/fetchRoles';
import { useQuery } from '@tanstack/react-query';

export const useRoles = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles(),
  });
