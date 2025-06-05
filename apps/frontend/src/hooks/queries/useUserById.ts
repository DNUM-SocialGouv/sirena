import { fetchUserById } from '@/lib/api/fetchUsers';
import { useQuery } from '@tanstack/react-query';

export const useUserById = (userId: string) =>
  useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId, // Ne déclencher la requête que si userId est défini
  });
