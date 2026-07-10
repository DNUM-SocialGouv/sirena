import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export type StatutCount = { id: string; count: number };

export async function fetchStatutCounts(params: { statutIds: string; entiteId?: string; search?: string }) {
  const res = await client['requetes-entite']['statut-counts'].$get({
    query: {
      statutIds: params.statutIds,
      ...(params.entiteId && { entiteId: params.entiteId }),
      ...(params.search && { search: params.search }),
    },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data as StatutCount[];
}
