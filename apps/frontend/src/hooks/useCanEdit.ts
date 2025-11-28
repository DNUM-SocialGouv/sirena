import { REQUETE_ETAPE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useProcessingSteps } from './queries/processingSteps.hook';

export function useCanEdit({ requeteId }: { requeteId?: string } = {}) {
  const userStore = useUserStore();
  const requestQuery = requeteId ? useProcessingSteps(requeteId) : null;

  const canEdit = useMemo(() => {
    // First check user permissions
    const editRoles: string[] = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER];
    const hasUserPermissions = userStore.role ? editRoles.includes(userStore.role) : false;

    if (!hasUserPermissions) {
      return false;
    }

    // Then check if the request is closed
    if (requestQuery?.data?.data) {
      const hasClosedStep = requestQuery.data.data.some(
        (step) => step.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      );
      return !hasClosedStep;
    }

    return true;
  }, [userStore.role, requestQuery]);

  return { canEdit };
}
