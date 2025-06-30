import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function fetchRoles() {
  const res = await client.roles.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
