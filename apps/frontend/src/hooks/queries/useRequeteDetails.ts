import { skipToken, useQuery } from '@tanstack/react-query';
import { fetchRequeteDetails, fetchRequeteOtherEntitiesAffected } from '@/lib/api/fetchRequetesEntite';

export const useRequeteDetails = (requestId?: string) => {
  return useQuery({
    queryKey: ['requete', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      return await fetchRequeteDetails(requestId);
    },
    enabled: !!requestId,
  });
};

type RequeteOtherEntitiesAffected = Awaited<ReturnType<typeof fetchRequeteOtherEntitiesAffected>>;

const emptyOtherEntitiesAffected: RequeteOtherEntitiesAffected = { otherEntites: [], directions: [] };

export const useRequeteOtherEntitiesAffected = (requestId?: string) => {
  return useQuery<RequeteOtherEntitiesAffected>({
    queryKey: ['requeteOtherEntitiesAffected', requestId ?? ''],
    queryFn: requestId ? () => fetchRequeteOtherEntitiesAffected(requestId) : skipToken,
    placeholderData: emptyOtherEntitiesAffected,
  });
};
