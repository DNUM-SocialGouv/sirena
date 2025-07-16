import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import type { QueryParams } from '@/types/pagination.type.ts';

export async function fetchDematSocialMappings(query: QueryParams = {}) {
  const res = await client['demat-social-mapping'].$get({ query });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}
export async function fetchDematSocialMappingById(id: string) {
  const res = await client['demat-social-mapping'][':id'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type PatchDematSocialMappingJson = {
  label: string;
  dematSocialId: string;
  comment: string;
};

export async function patchDematSocialMappingById(id: string, json: PatchDematSocialMappingJson) {
  const res = await client['demat-social-mapping'][':id'].$patch({ param: { id }, json });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
