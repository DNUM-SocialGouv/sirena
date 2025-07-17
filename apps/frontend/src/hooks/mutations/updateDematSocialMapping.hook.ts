import { useMutation } from '@tanstack/react-query';
import { type PatchDematSocialMappingJson, patchDematSocialMappingById } from '@/lib/api/fetchDematSocialMappings';
import { queryClient } from '@/lib/queryClient';
import { useDematSocialMappingQueryOptions } from '../queries/dematSocialMapping.hook';

export const usePatchDematSocialMapping = () => {
  return useMutation({
    mutationFn: ({ id, json }: { id: string; json: PatchDematSocialMappingJson }) =>
      patchDematSocialMappingById(id, json),
    onMutate: async ({ id, json }) => {
      const queryOpts = useDematSocialMappingQueryOptions(id);
      await queryClient.cancelQueries(queryOpts);

      const previousDematSocialMapping = queryClient.getQueryData(queryOpts.queryKey);

      if (previousDematSocialMapping) {
        queryClient.setQueryData(queryOpts.queryKey, {
          ...previousDematSocialMapping,
          ...json,
        });
      }

      return { id, previousDematSocialMapping };
    },
    onError: (_err, variables, context) => {
      if (context?.previousDematSocialMapping) {
        queryClient.setQueryData(['dematSocialMapping', variables.id], context.previousDematSocialMapping);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['dematSocialMapping', variables.id], data);
    },
  });
};
