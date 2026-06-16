import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export type DomaineCount = { id: string; count: number };

export async function fetchDomaineCounts(params: { domaineIds: string; entiteId?: string; search?: string }) {
  const res = await client['requetes-entite']['domaine-counts'].$get({
    query: {
      domaineIds: params.domaineIds,
      ...(params.entiteId && { entiteId: params.entiteId }),
      ...(params.search && { search: params.search }),
    },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data as DomaineCount[];
}
