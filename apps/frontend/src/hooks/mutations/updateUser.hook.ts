import { useMutation } from '@tanstack/react-query';
import { type PatchUserJson, patchUserById } from '@/lib/api/fetchUsers';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { queryClient } from '@/lib/queryClient';
import { useUserByIdQueryOptions } from '../queries/users.hook';

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
    onError: (error, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', variables.id], context.previousUser);
      }
      // An HTTP failure is already toasted by handleRequestErrors; only a request
      // that never got an answer is silent.
      if (!(error instanceof HttpError)) notifySaveNetworkFailure();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['user', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
