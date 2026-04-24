import { useMutation } from '@tanstack/react-query';
import {
  type CreateFeatureFlagJson,
  createFeatureFlagApi,
  deleteFeatureFlagApi,
  type PatchFeatureFlagJson,
  patchFeatureFlagApi,
} from '@/lib/api/fetchFeatureFlags';
import { queryClient } from '@/lib/queryClient';

export const useCreateFeatureFlag = () => {
  return useMutation({
    mutationFn: (json: CreateFeatureFlagJson) => createFeatureFlagApi(json),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
    },
  });
};

export const usePatchFeatureFlag = () => {
  return useMutation({
    mutationFn: ({ id, json }: { id: string; json: PatchFeatureFlagJson }) => patchFeatureFlagApi(id, json),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
    },
  });
};

export const useDeleteFeatureFlag = () => {
  return useMutation({
    mutationFn: (id: string) => deleteFeatureFlagApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
    },
  });
};
