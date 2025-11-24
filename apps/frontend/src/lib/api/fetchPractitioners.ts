import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type PractitionerQuery = {
  fullName?: string;
  identifier?: string;
};

export type Practitioner = {
  fullName: string;
  firstName: string;
  lastName: string;
  prefix: string;
  rpps: string;
};

export async function fetchPractitioners(query: PractitionerQuery): Promise<Practitioner[]> {
  const res = await client.esante.practionners.$get({ query });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
