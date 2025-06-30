import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function fetchProfile() {
  const res = await client.profile.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
