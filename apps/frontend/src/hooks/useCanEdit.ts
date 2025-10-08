import { ROLES } from '@sirena/common/constants';
import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';

export function useCanEdit() {
  const userStore = useUserStore();

  const canEdit = useMemo(() => {
    const editRoles: string[] = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER];
    return (userStore.role && editRoles.includes(userStore.role as string)) || false;
  }, [userStore.role]);

  return { canEdit };
}
