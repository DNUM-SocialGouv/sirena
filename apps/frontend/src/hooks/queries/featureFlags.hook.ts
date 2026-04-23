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
  });

  const setFlags = useFeatureFlagStore((s) => s.setFlags);
  const reset = useFeatureFlagStore((s) => s.reset);

  useEffect(() => {
    if (query.data) setFlags(query.data);
  }, [query.data, setFlags]);

  useEffect(() => {
    if (query.isError) reset();
  }, [query.isError, reset]);

  return query;
};
