import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export const useRequeteDetails = (requestId?: string) => {
  return useQuery({
    queryKey: ['requete', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const response = await client['requetes-entite'][':id'].$get({
        param: { id: requestId },
      });
      await handleRequestErrors(response);
      const result = await response.json();
      return result.data;
    },
    enabled: !!requestId,
  });
};
