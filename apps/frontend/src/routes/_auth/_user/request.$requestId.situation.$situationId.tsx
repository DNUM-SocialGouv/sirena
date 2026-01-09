import { REQUETE_CLOTURE_REASON, type ReceptionType, ROLES } from '@sirena/common/constants';
import type { SituationData as SituationDataSchema } from '@sirena/common/schemas';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import {
  CloseRequeteModal,
  type CloseRequeteModalRef,
  type OtherEntityAffected,
} from '@/components/requestId/processing/CloseRequeteModal';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
import { useEntites } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { formatSituationFromServer } from '@/lib/situation';

export const Route = createFileRoute('/_auth/_user/request/$requestId/situation/$situationId')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]),
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
      situationId: z.string().parse(params.situationId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Lieu, mis en cause et faits - Édition requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

type SituationData = NonNullable<
  NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['situations']
>[number];

type PendingSaveData = {
  data: SituationDataSchema;
  shouldCreateRequest: boolean;
  faitFiles: File[];
  initialFileIds?: string[];
  initialFiles?: Array<{ id: string; entiteId?: string | null }>;
};

function RouteComponent() {
  const { requestId, situationId } = Route.useParams();
  const navigate = useNavigate();
  const requestQuery = useRequeteDetails(requestId);
  const { data: profile } = useProfile();
  const { data: entitesData } = useEntites(undefined);
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const [shouldShowCloseModal, setShouldShowCloseModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<PendingSaveData | null>(null);
  const [computedOtherEntities, setComputedOtherEntities] = useState<OtherEntityAffected[]>([]);
  const [formResetKey, setFormResetKey] = useState(0);

  const willUserBeUnassignedAfterSave = useCallback(
    (newSituationData: SituationDataSchema, allSituations: SituationData[], currentSituationId: string): boolean => {
      if (!profile?.topEntiteId && !profile?.entiteId) return false;

      const userEntityIds = new Set<string>();
      if (profile.topEntiteId) userEntityIds.add(profile.topEntiteId);
      if (profile.entiteId) userEntityIds.add(profile.entiteId);

      for (const situation of allSituations) {
        if (situation.id === currentSituationId) {
          const newEntites = newSituationData.traitementDesFaits?.entites || [];
          const isAssigned = newEntites.some((entite) => {
            if (userEntityIds.has(entite.entiteId)) return true;
            if (entite.directionServiceId && userEntityIds.has(entite.directionServiceId)) return true;
            return false;
          });
          if (isAssigned) return false;
        } else {
          const traitementDesFaits = situation.traitementDesFaits;
          if (traitementDesFaits?.entites && traitementDesFaits.entites.length > 0) {
            const isAssigned = traitementDesFaits.entites.some((entite) => {
              if (userEntityIds.has(entite.entiteId)) return true;
              if (entite.directionServiceId && userEntityIds.has(entite.directionServiceId)) return true;
              return false;
            });
            if (isAssigned) return false;
          }
        }
      }

      return true;
    },
    [profile?.topEntiteId, profile?.entiteId],
  );

  const computeOtherEntitiesAfterSave = useCallback(
    (
      newSituationData: SituationDataSchema,
      allSituations: SituationData[],
      currentSituationId: string,
    ): OtherEntityAffected[] => {
      if (!profile?.topEntiteId) return [];

      const entitiesMap = new Map<string, OtherEntityAffected>();
      const allEntites = entitesData?.data || [];

      for (const situation of allSituations) {
        let entitiesToProcess: Array<{ entiteId: string; directionServiceId?: string }> = [];

        if (situation.id === currentSituationId) {
          entitiesToProcess = newSituationData.traitementDesFaits?.entites || [];
        } else {
          entitiesToProcess = situation.traitementDesFaits?.entites || [];
        }

        for (const entite of entitiesToProcess) {
          if (entite.entiteId !== profile.topEntiteId) {
            if (!entitiesMap.has(entite.entiteId)) {
              const entiteDetails = allEntites.find(
                (e: { id: string; nomComplet: string; entiteTypeId?: string }) => e.id === entite.entiteId,
              );
              if (entiteDetails) {
                entitiesMap.set(entite.entiteId, {
                  id: entiteDetails.id,
                  nomComplet: entiteDetails.nomComplet,
                  entiteTypeId: entiteDetails.entiteTypeId || '',
                  statutId: '',
                });
              }
            }
          }
        }
      }

      return Array.from(entitiesMap.values());
    },
    [profile?.topEntiteId, entitesData?.data],
  );

  const handleSaveSuccess = () => {
    navigate({ to: '/request/$requestId', params: { requestId } });
  };

  const { handleSave: performSave } = useSituationSave({
    requestId,
    situationId,
    onRefetch: () => requestQuery.refetch(),
    onSuccess: handleSaveSuccess,
  });

  const executePendingSave = useCallback(async () => {
    if (!pendingSaveData) return;
    const { data, shouldCreateRequest, faitFiles, initialFileIds, initialFiles } = pendingSaveData;
    setPendingSaveData(null);
    await performSave(data, shouldCreateRequest, faitFiles, initialFileIds, initialFiles);
  }, [pendingSaveData, performSave]);

  const handleCloseModalCancel = useCallback(async () => {
    await executePendingSave();
    setShouldShowCloseModal(false);
  }, [executePendingSave]);

  const handleCloseModalSuccess = useCallback(async () => {
    await executePendingSave();
    setShouldShowCloseModal(false);
  }, [executePendingSave]);

  const handleModalDismiss = useCallback(() => {
    setPendingSaveData(null);
    setShouldShowCloseModal(false);
    setFormResetKey((prev) => prev + 1);
  }, []);

  return (
    <QueryStateHandler query={requestQuery}>
      {({ data }) => {
        const request = data;
        const situations = request?.requete?.situations ?? [];

        const situation = situations.find((s) => s.id === situationId);
        const receptionTypeId = data?.requete.receptionTypeId as ReceptionType | undefined;

        const formattedData = formatSituationFromServer(situation);

        const handleSave = async (
          formData: SituationDataSchema,
          shouldCreateRequest: boolean,
          faitFiles: File[],
          initialFileIds?: string[],
          initialFiles?: Array<{ id: string; entiteId?: string | null }>,
        ) => {
          const willBeUnassigned = willUserBeUnassignedAfterSave(formData, situations, situationId);

          if (willBeUnassigned) {
            const otherEntities = computeOtherEntitiesAfterSave(formData, situations, situationId);
            setComputedOtherEntities(otherEntities);
            setPendingSaveData({ data: formData, shouldCreateRequest, faitFiles, initialFileIds, initialFiles });
            setShouldShowCloseModal(true);
            setTimeout(() => {
              closeRequeteModalRef.current?.openModal();
            }, 100);
          } else {
            await performSave(formData, shouldCreateRequest, faitFiles, initialFileIds, initialFiles);
          }
        };

        return (
          <>
            <SituationForm
              key={formResetKey}
              mode="edit"
              requestId={requestId}
              situationId={situationId}
              initialData={formattedData}
              receptionType={receptionTypeId}
              onSave={handleSave}
            />
            {shouldShowCloseModal && (
              <CloseRequeteModal
                ref={closeRequeteModalRef}
                requestId={requestId}
                date={
                  request?.requete?.createdAt
                    ? new Date(request.requete.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : ''
                }
                misEnCause={situations?.[0]?.misEnCause?.misEnCauseType?.label || 'Non spécifié'}
                initialReasonId={REQUETE_CLOTURE_REASON.HORS_COMPETENCE}
                otherEntitiesAffected={computedOtherEntities}
                customDescription={`Votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête ${requestId}.`}
                onCancel={handleCloseModalCancel}
                onSuccess={handleCloseModalSuccess}
                onDismiss={handleModalDismiss}
              />
            )}
          </>
        );
      }}
    </QueryStateHandler>
  );
}
