import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type Address = {
  id: string;
  label: string;
  type: string;
  name: string;
  postcode: string;
  citycode: string;
  city: string;
  context: string;
};

export async function fetchAddresses(q: string): Promise<Address[]> {
  const res = await client.adresse.search.$get({ query: { q } });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
