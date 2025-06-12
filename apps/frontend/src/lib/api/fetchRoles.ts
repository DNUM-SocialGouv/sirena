import { client } from '@/lib/api/hc.ts';

export async function fetchRoles() {
  const res = await client.roles.$get();
  if (!res.ok) throw new Error('Failed to fetch roles');
  const data = await res.json();
  return data;
}
