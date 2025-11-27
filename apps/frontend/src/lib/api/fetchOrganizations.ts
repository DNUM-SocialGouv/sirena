import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type OrganizationQuery = {
  name?: string;
  identifier?: string;
  addressPostalcode?: string;
};

export type Organization = {
  name: string;
  identifier: string;
  addressPostalcode: string;
  addressCity: string;
};

export async function fetchOrganizations(query: OrganizationQuery): Promise<Organization[]> {
  const res = await client.esante.organizations.$get({ query });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
