import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function fetchResolvedFeatureFlags() {
  const res = await client['feature-flags'].resolve.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchFeatureFlags() {
  const res = await client['feature-flags'].$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type CreateFeatureFlagJson = {
  name: string;
  description?: string;
  enabled?: boolean;
  userEmails?: string[];
  entiteIds?: string[];
};

export async function createFeatureFlagApi(json: CreateFeatureFlagJson) {
  const res = await client['feature-flags'].$post({ json });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type PatchFeatureFlagJson = {
  description?: string;
  enabled?: boolean;
  userEmails?: string[];
  entiteIds?: string[];
};

export async function patchFeatureFlagApi(id: string, json: PatchFeatureFlagJson) {
  const res = await client['feature-flags'][':id'].$patch({ param: { id }, json });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function deleteFeatureFlagApi(id: string) {
  const res = await client['feature-flags'][':id'].$delete({ param: { id } });
  await handleRequestErrors(res);
}
