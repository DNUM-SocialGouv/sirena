import type { Role, StatutType } from '@sirena/common/constants';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import { useUserStore } from '@/stores/userStore';

export async function fetchProfile() {
  const res = await client.profile.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  const userStore = useUserStore.getState();
  userStore.setRole(data.roleId as Role);
  userStore.setStatutId(data.statutId as StatutType);
  return data;
}
