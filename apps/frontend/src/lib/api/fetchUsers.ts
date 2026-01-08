import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import type { GetUsersQuery } from '@/types/queries.type';

export async function fetchUsers(query: GetUsersQuery) {
  const res = await client.users.$get({
    query: {
      ...query,
      limit: query.limit?.toString(),
      offset: query.offset?.toString(),
    },
  });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
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
