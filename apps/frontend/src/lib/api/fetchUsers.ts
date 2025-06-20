import { client } from '@/lib/api/hc.ts';

export async function fetchUsers(query: { roleId?: string; active?: 'true' | 'false' }) {
  const res = await client.users.$get({ query });
  if (!res.ok) throw new Error('Failed to fetch user');
  const data = await res.json();
  return data;
}

export async function fetchUserById(id: string) {
  const res = await client.users[':id'].$get({ param: { id } });
  if (!res.ok) throw new Error('Failed to fetch user');
  const data = await res.json();
  return data;
}
