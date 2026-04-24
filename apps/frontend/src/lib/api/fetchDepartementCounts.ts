import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export type DepartementCount = { code: string; count: number };

export async function fetchDepartementCounts(params: { departementCodes: string; entiteId?: string; search?: string }) {
  const res = await client['requetes-entite']['department-counts'].$get({
    query: {
      departementCodes: params.departementCodes,
      ...(params.entiteId && { entiteId: params.entiteId }),
      ...(params.search && { search: params.search }),
    },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data as DepartementCount[];
}
