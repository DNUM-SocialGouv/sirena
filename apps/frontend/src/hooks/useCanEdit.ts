import { REQUETE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useRequeteDetails } from './queries/useRequeteDetails';

export function useCanEdit({ requeteId }: { requeteId?: string } = {}) {
  const userStore = useUserStore();
  const requestQuery = requeteId ? useRequeteDetails(requeteId) : null;

  const editRoles: string[] = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER];
  const hasEditRole = userStore.role ? editRoles.includes(userStore.role) : false;

  const canEdit = useMemo(() => {
    if (!hasEditRole) {
      return false;
    }

    if (!requeteId) {
      return true;
    }

    if (requestQuery?.data?.statutId === REQUETE_STATUT_TYPES.CLOTUREE) {
      return false;
    }

    return true;
  }, [hasEditRole, requestQuery, requeteId]);

  return { canEdit, hasEditRole };
}
