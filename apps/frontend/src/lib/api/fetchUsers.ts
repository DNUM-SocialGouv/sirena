// import type { paths } from "@/types/openapi";

// type GetUserResponse =
//   paths["/user"]["get"]["responses"]["200"]["content"]["application/json"];

// export async function fetchUser() {
//   const res = await fetch("/api/user");
//   if (!res.ok) throw new Error("Failed to fetch user");
//   const data = (await res.json()) as GetUserResponse;
//   return data;
// }

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
