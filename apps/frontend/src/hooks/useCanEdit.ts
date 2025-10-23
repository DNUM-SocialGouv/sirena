import { REQUETE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useProcessingSteps } from './queries/processingSteps.hook';

export function useCanEdit({ requeteId }: { requeteId?: string } = {}) {
  const userStore = useUserStore();
  const requestQuery = requeteId ? useProcessingSteps(requeteId) : null;

  const canEdit = useMemo(() => {
    if (requestQuery?.data?.data) {
      const hasClosedStep = requestQuery.data.data.some((step) => step.statutId === REQUETE_STATUT_TYPES.CLOTUREE);
      return !hasClosedStep;
    }
    const editRoles: string[] = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER];
    return (userStore.role && editRoles.includes(userStore.role as string)) || false;
  }, [userStore.role, requestQuery]);

  return { canEdit };
}
