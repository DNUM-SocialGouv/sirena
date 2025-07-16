import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { QueryParams } from '@/types/pagination.type.ts';

export async function fetchRequetesEntite(query: QueryParams = {}) {
  const res = await client['requetes-entite'].$get({ query });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}
