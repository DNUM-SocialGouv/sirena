import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export async function createRequeteEntite() {
  const res = await client['requetes-entite'].$post();
  await handleRequestErrors(res);
  const result = await res.json();
  return result.data;
}
