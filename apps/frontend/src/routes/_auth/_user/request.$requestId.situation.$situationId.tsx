import { REQUETE_CLOTURE_REASON, type ReceptionType, ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CloseRequeteModal, type CloseRequeteModalRef } from '@/components/requestId/processing/CloseRequeteModal';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useRequeteDetails, useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
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

function RouteComponent() {
  const { requestId, situationId } = Route.useParams();
  const navigate = useNavigate();
  const requestQuery = useRequeteDetails(requestId);
  const { data: profile } = useProfile();
  const { data: otherEntitiesAffected = [] } = useRequeteOtherEntitiesAffected(requestId);
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const [shouldShowCloseModal, setShouldShowCloseModal] = useState(false);

  const isUserEntityStillAssigned = (situations: SituationData[] | undefined) => {
    if (!profile?.topEntiteId && !profile?.entiteId) return true;
    if (!situations || situations.length === 0) return false;

    const userEntityIds = new Set<string>();
    if (profile.topEntiteId) userEntityIds.add(profile.topEntiteId);
    if (profile.entiteId) userEntityIds.add(profile.entiteId);

    return situations.some((situation) => {
      const traitementDesFaits = situation.traitementDesFaits;
      if (!traitementDesFaits?.entites || traitementDesFaits.entites.length === 0) return false;

      return traitementDesFaits.entites.some((entite) => {
        if (userEntityIds.has(entite.entiteId)) return true;
        if (entite.directionServiceId && userEntityIds.has(entite.directionServiceId)) return true;
        return false;
      });
    });
  };

  const handleSaveSuccess = async () => {
    const { data: updatedRequest } = await requestQuery.refetch();

    const situations = updatedRequest?.requete?.situations ?? [];

    if (!isUserEntityStillAssigned(situations)) {
      setShouldShowCloseModal(true);
      setTimeout(() => {
        closeRequeteModalRef.current?.openModal();
      }, 100);
    } else {
      navigate({ to: '/request/$requestId', params: { requestId } });
    }
  };

  const handleCloseModalCancel = () => {
    setShouldShowCloseModal(false);
    navigate({ to: '/request/$requestId', params: { requestId } });
  };

  const handleCloseModalSuccess = () => {
    setShouldShowCloseModal(false);
    navigate({ to: '/request/$requestId', params: { requestId } });
  };

  return (
    <QueryStateHandler query={requestQuery}>
      {({ data }) => {
        const request = data;
        const situations = request?.requete?.situations ?? [];

        const situation = situations.find((s) => s.id === situationId);
        const receptionTypeId = data?.requete.receptionTypeId as ReceptionType | undefined;

        const formattedData = formatSituationFromServer(situation);

        const { handleSave } = useSituationSave({
          requestId,
          situationId,
          onRefetch: () => requestQuery.refetch(),
          onSuccess: handleSaveSuccess,
        });

        return (
          <>
            <SituationForm
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
                otherEntitiesAffected={otherEntitiesAffected}
                customDescription={`Votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête ${requestId}.`}
                onCancel={handleCloseModalCancel}
                onSuccess={handleCloseModalSuccess}
              />
            )}
          </>
        );
      }}
    </QueryStateHandler>
  );
}
