import { useMutation } from '@tanstack/react-query';
import { client } from '@/lib/api/hc';
import { handleRequestErrors, type RequestErrorOptions } from '@/lib/api/tanstackQuery';

// TODO: gerer le refresh cache ?
export const useSetRequeteFile = (_options: Partial<RequestErrorOptions> = {}) => {
  return useMutation({
    mutationFn: async ({ requeteId, fileIds }: { requeteId: string; fileIds: string[] }) => {
      const res = await client['requetes-entite'][':id'].files.$patch({
        json: { fileIds },
        param: { id: requeteId },
      });

      await handleRequestErrors(res);
      return res.json();
    },
  });
};
