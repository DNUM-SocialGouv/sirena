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
import type { CreateUserBody } from '@/types/users.d.ts';

export async function fetchUsers() {
  const res = await client.users.$get();
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

export async function createUser(user: CreateUserBody) {
  const res = await client.users.$post({ json: user });
  if (!res.ok) throw new Error('Failed to create user');
  const data = await res.json();
  return data;
}

export async function deleteUser(id: string) {
  const res = await client.users[':id'].$delete({ param: { id } });
  if (!res.ok) throw new Error('Failed to delete user');
  const data = await res.json();
  return data;
}
