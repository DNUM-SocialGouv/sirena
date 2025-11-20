import { useQuery } from '@tanstack/react-query';
import { fetchRequeteDetails, fetchRequeteOtherEntitiesAffected } from '@/lib/api/fetchRequetesEntite';

export const useRequeteDetails = (requestId?: string) => {
  return useQuery({
    queryKey: ['requete', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const response = await fetchRequeteDetails(requestId);
      return response;
    },
    enabled: !!requestId,
  });
};

export const useRequeteOtherEntitiesAffected = (requestId: string) => {
  return useQuery({
    queryKey: ['requeteOtherEntitiesAffected', requestId],
    queryFn: async () => {
      const response = await fetchRequeteOtherEntitiesAffected(requestId);
      return response;
    },
    placeholderData: [],
    enabled: !!requestId,
  });
};
