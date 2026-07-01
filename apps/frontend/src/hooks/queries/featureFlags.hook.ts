import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchFeatureFlags, fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';

export const useFeatureFlags = () =>
  useQuery({
    queryKey: ['featureFlags'],
    queryFn: fetchFeatureFlags,
  });

export const useResolvedFeatureFlags = () => {
  const query = useQuery({
    queryKey: ['featureFlags', 'resolved'],
    queryFn: fetchResolvedFeatureFlags,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const setFlags = useFeatureFlagStore((s) => s.setFlags);

  useEffect(() => {
    if (query.data) setFlags(query.data);
  }, [query.data, setFlags]);

  return query;
};
