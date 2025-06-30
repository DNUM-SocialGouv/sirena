import { type PatchUserJson, fetchUserById, fetchUsers, patchUserById } from '@/lib/api/fetchUsers';
import { queryClient } from '@/lib/queryClient';
import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';

export const useUsers = (query?: { roleId?: string; active?: 'true' | 'false' }, enabled = true) =>
  useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query || {}),
    enabled,
  });

const useUserByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId, // Ne déclencher la requête que si userId est défini
  });

export const useUserById = (userId: string) => useQuery(useUserByIdQueryOptions(userId));

export const usePatchUser = () => {
  return useMutation({
    mutationFn: ({ id, json }: { id: string; json: PatchUserJson }) => patchUserById(id, json),
    onMutate: async ({ id, json }) => {
      const queryOpts = useUserByIdQueryOptions(id);
      await queryClient.cancelQueries(queryOpts);

      const previousUser = queryClient.getQueryData(queryOpts.queryKey);

      if (previousUser) {
        queryClient.setQueryData(queryOpts.queryKey, {
          ...previousUser,
          ...json,
        });
      }

      return { id, previousUser };
    },
    onSettled: (_data, _err, { id }) => queryClient.invalidateQueries({ queryKey: ['user', id] }),
    onError: (_err, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', variables.id], context.previousUser);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['user', variables.id], data);
    },
  });
};
