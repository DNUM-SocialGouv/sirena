import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function fetchVersion() {
  const res = await client.version.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
