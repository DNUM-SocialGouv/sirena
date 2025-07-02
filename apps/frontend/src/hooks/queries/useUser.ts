import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchUserById, fetchUsers } from '@/lib/api/fetchUsers';

export const useUsers = (query?: { roleId?: string; active?: 'true' | 'false' }, enabled = true) =>
  useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query || {}),
    enabled,
  });

export const useUserByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId, // Ne déclencher la requête que si userId est défini
  });

export const useUserById = (userId: string) => useQuery(useUserByIdQueryOptions(userId));
