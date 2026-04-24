import { useFeatureFlagStore } from '@/stores/featureFlagStore';

export const useHasFeature = (name: string, defaultValue: boolean): boolean => {
  return useFeatureFlagStore((s) => s.flags[name] ?? defaultValue);
};
