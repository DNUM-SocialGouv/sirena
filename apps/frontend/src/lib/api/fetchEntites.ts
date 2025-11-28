import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { QueryParams } from '@/types/pagination.type.ts';

export async function fetchEntites(id: string | undefined, query: QueryParams = {}) {
  const res = await client.entites[':id?'].$get({ param: { id }, query });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}

export async function fetchEntiteChain(id: string | undefined) {
  const res = await client.entites.chain[':id?'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchEntiteDescendants(id: string) {
  const res = await client.entites.descendants[':id'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
