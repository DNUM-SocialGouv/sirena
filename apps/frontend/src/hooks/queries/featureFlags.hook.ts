import { useQuery } from '@tanstack/react-query';
import { fetchFeatureFlags, fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';

export const useFeatureFlags = () =>
  useQuery({
    queryKey: ['featureFlags'],
    queryFn: fetchFeatureFlags,
  });

export const useResolvedFeatureFlags = () =>
  useQuery({
    queryKey: ['featureFlags', 'resolved'],
    queryFn: fetchResolvedFeatureFlags,
  });
