import { fetchUsers } from '@/lib/api/fetchUsers';
import { useQuery } from '@tanstack/react-query';

export const useUser = () =>
  useQuery({
    queryKey: ['user'],
    queryFn: () => fetchUsers(),
  });
