import { REQUETE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useRequeteDetails } from './queries/useRequeteDetails';

export function useCanEdit({ requeteId }: { requeteId?: string } = {}) {
  const userStore = useUserStore();
  const requestQuery = requeteId ? useRequeteDetails(requeteId) : null;

  const canEdit = useMemo(() => {
    // First check user permissions
    const editRoles: string[] = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER];
    const hasUserPermissions = userStore.role ? editRoles.includes(userStore.role) : false;

    if (!hasUserPermissions) {
      return false;
    }

    if (!requeteId) {
      return true;
    }

    // Then check if the request is closed
    if (requestQuery?.data?.statutId === REQUETE_STATUT_TYPES.CLOTUREE) {
      return false;
    }

    return true;
  }, [userStore.role, requestQuery, requeteId]);

  return { canEdit };
}
