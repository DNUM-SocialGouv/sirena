import { useMutation } from '@tanstack/react-query';
import { type PatchUserJson, patchUserById } from '@/lib/api/fetchUsers';
import { queryClient } from '@/lib/queryClient';
import { useUserByIdQueryOptions } from '../queries/useUser';

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
