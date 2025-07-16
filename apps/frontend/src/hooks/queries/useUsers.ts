import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchUserById, fetchUsers } from '@/lib/api/fetchUsers';
import type { GetUsersQuery } from '@/types/queries.type';

export const useUsers = (query?: GetUsersQuery) =>
  useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query || {}),
  });

export const useUserByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
  });

export const useUserById = (userId: string) => useQuery(useUserByIdQueryOptions(userId));
