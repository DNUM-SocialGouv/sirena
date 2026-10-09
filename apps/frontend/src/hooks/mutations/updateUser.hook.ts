import { useMutation } from '@tanstack/react-query';
import { type PatchUserJson, patchUserById } from '@/lib/api/fetchUsers';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { queryClient } from '@/lib/queryClient';
import { useUserByIdQueryOptions } from '../queries/users.hook';

export const usePatchUser = () => {
  return useMutation({
    mutationFn: ({ id, json }: { id: string; json: PatchUserJson }) => patchUserById(id, json),
    // No optimistic write: nothing on the form renders the cached role or status, and
    // rolling one back re-seeded the form from the server, discarding what the admin
    // had just entered on a failed save.
    onError: (error) => {
      // An HTTP failure is already toasted by handleRequestErrors; only a request
      // that never got an answer is silent.
      if (!(error instanceof HttpError)) notifySaveNetworkFailure();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(useUserByIdQueryOptions(variables.id).queryKey, data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
