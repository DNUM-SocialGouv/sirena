import { useQuery } from '@tanstack/react-query';
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

export const useRequeteOtherEntitiesAffected = (requestId: string) => {
  return useQuery({
    queryKey: ['requeteOtherEntitiesAffected', requestId],
    queryFn: async () => {
      return await fetchRequeteOtherEntitiesAffected(requestId);
    },
    placeholderData: [],
    enabled: !!requestId,
  });
};
