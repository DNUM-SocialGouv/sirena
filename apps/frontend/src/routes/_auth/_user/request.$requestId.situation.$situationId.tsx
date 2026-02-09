import { type ReceptionType, ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CloseRequeteModal, type CloseRequeteModalRef } from '@/components/requestId/processing/CloseRequeteModal';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
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
  head: ({ params }) => ({
    meta: [
      {
        title: `Lieu, mis en cause et faits - Édition requête ${params.requestId} - SIRENA`,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId, situationId } = Route.useParams();
  const navigate = useNavigate();
  const requestQuery = useRequeteDetails(requestId);
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [shouldCloseRequeteStatus, setShouldCloseRequeteStatus] = useState<{
    willUserBeUnassignedAfterSave: boolean;
    otherEntitiesAffected: Array<{
      id: string;
      nomComplet: string;
      entiteTypeId: string;
      statutId: string;
    }>;
  } | null>(null);
  const [formResetKey] = useState(0);

  const { handleSave: performSave } = useSituationSave({
    requestId,
    situationId,
    onRefetch: () => requestQuery.refetch(),
    onSuccess: (result) => {
      if (result.shouldCloseRequeteStatus?.willUserBeUnassignedAfterSave) {
        setShouldCloseRequeteStatus(result.shouldCloseRequeteStatus);
        closeRequeteModalRef.current?.openModal();
      } else {
        navigate({ to: '/request/$requestId', params: { requestId } });
      }
    },
  });

  const handleCloseModalCancel = async () => {
    setShouldCloseRequeteStatus(null);
    navigate({ to: '/request/$requestId', params: { requestId } });
  };

  const handleBeforeClose = async () => {
    navigate({ to: '/request/$requestId', params: { requestId } });
  };

  const handleCloseModalSuccess = () => {
    setShouldCloseRequeteStatus(null);
    navigate({ to: '/request/$requestId', params: { requestId } });
  };

  const handleModalDismiss = () => {
    setShouldCloseRequeteStatus(null);
  };

  return (
    <QueryStateHandler query={requestQuery}>
      {({ data }) => {
        const request = data;
        const situations = request?.requete?.situations ?? [];

        const situation = situations.find((s) => s.id === situationId);
        const receptionTypeId = data?.requete.receptionTypeId as ReceptionType | undefined;

        const formattedData = formatSituationFromServer(situation);

        return (
          <>
            <SituationForm
              key={formResetKey}
              mode="edit"
              requestId={requestId}
              situationId={situationId}
              initialData={formattedData}
              receptionType={receptionTypeId}
              onSave={performSave}
              saveButtonRef={saveButtonRef}
            />
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
              otherEntitiesAffected={shouldCloseRequeteStatus?.otherEntitiesAffected || []}
              customDescription={`Attention : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête ${requestId}.`}
              triggerButtonRef={saveButtonRef}
              onBeforeClose={handleBeforeClose}
              onCancel={handleCloseModalCancel}
              onSuccess={handleCloseModalSuccess}
              onDismiss={handleModalDismiss}
            />
          </>
        );
      }}
    </QueryStateHandler>
  );
}
