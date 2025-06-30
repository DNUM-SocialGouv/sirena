import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function fetchUsers(query: { roleId?: string; active?: 'true' | 'false' }) {
  const res = await client.users.$get({ query });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchUserById(id: string) {
  const res = await client.users[':id'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type PatchUserJson = {
  roleId: string;
  entiteId?: string | null;
  statutId: string;
};

export async function patchUserById(id: string, json: PatchUserJson) {
  const res = await client.users[':id'].$patch({ param: { id }, json });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
