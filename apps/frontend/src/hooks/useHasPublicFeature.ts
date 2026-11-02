import { useQuery } from '@tanstack/react-query';
import { publicFeatureFlagsQueryOptions } from '@/hooks/queries/featureFlags.hook';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useUserStore } from '@/stores/userStore';

// Resolved flags only reach the store inside /_auth. A flag that drives what a signed out visitor
// sees is also served by a public endpoint, read here while nobody is signed in.
export const useHasPublicFeature = (name: string, defaultValue: boolean): boolean => {
  const isLogged = useUserStore((state) => state.isLogged);
  const resolved = useFeatureFlagStore((state) => state.flags[name]);
  const { data } = useQuery({ ...publicFeatureFlagsQueryOptions(), enabled: !isLogged });

  if (resolved !== undefined) return resolved;

  return data?.[name] ?? defaultValue;
};
