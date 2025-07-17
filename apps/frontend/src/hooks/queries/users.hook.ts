import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchUserById, fetchUsers } from '@/lib/api/fetchUsers';
import type { GetUsersQuery } from '@/types/queries.type';

export const useUsers = (query: GetUsersQuery = {}) =>
  useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query),
    initialData: { data: [], meta: { total: 0 } },
  });

export const useUserByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
  });

export const useUserById = (userId: string) => useQuery(useUserByIdQueryOptions(userId));
