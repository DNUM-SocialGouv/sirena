import { ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CloseRequeteModal, type CloseRequeteModalRef } from '@/components/requestId/processing/CloseRequeteModal';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationCreate } from '@/hooks/mutations/useSituationCreate';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create/situation')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]),
  head: () => ({
    meta: [
      {
        title: 'Description de la situation - Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [createdRequeteId, setCreatedRequeteId] = useState<string | null>(null);
  const [shouldCloseRequeteStatus, setShouldCloseRequeteStatus] = useState<{
    willUserBeUnassignedAfterSave: boolean;
    otherEntitiesAffected: Array<{
      id: string;
      nomComplet: string;
      entiteTypeId: string;
      statutId: string;
    }>;
  } | null>(null);
  const requestQuery = useRequeteDetails(createdRequeteId || '');

  const { handleSave } = useSituationCreate({
    onSuccess: (result) => {
      if (!result.requete?.id) return;
      const requeteId = result.requete.id;
      setCreatedRequeteId(requeteId);

      if (result.shouldCloseRequeteStatus?.willUserBeUnassignedAfterSave) {
        setShouldCloseRequeteStatus(result.shouldCloseRequeteStatus);
        setTimeout(() => {
          closeRequeteModalRef.current?.openModal();
        }, 100);
      } else {
        navigate({ to: '/request/$requestId', params: { requestId: requeteId } });
      }
    },
  });

  const handleCloseModalCancel = async () => {
    if (createdRequeteId) {
      setShouldCloseRequeteStatus(null);
      navigate({ to: '/request/$requestId', params: { requestId: createdRequeteId } });
    }
  };

  const handleBeforeClose = async () => {
    if (createdRequeteId) {
      navigate({ to: '/request/$requestId', params: { requestId: createdRequeteId } });
    }
  };

  const handleCloseModalSuccess = () => {
    if (createdRequeteId) {
      setShouldCloseRequeteStatus(null);
      navigate({ to: '/request/$requestId', params: { requestId: createdRequeteId } });
    }
  };

  const handleModalDismiss = () => {
    setShouldCloseRequeteStatus(null);
  };

  return (
    <>
      <SituationForm mode="create" onSave={handleSave} saveButtonRef={saveButtonRef} />
      {createdRequeteId && (
        <QueryStateHandler query={requestQuery}>
          {({ data: request }) => (
            <CloseRequeteModal
              ref={closeRequeteModalRef}
              requestId={createdRequeteId}
              date={
                request?.requete?.createdAt
                  ? new Date(request.requete.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : ''
              }
              misEnCause={request?.requete?.situations?.[0]?.misEnCause?.misEnCauseType?.label || 'Non spécifié'}
              otherEntitiesAffected={shouldCloseRequeteStatus?.otherEntitiesAffected || []}
              customDescription={`Attention : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête ${createdRequeteId}.`}
              triggerButtonRef={saveButtonRef}
              onBeforeClose={handleBeforeClose}
              onCancel={handleCloseModalCancel}
              onSuccess={handleCloseModalSuccess}
              onDismiss={handleModalDismiss}
            />
          )}
        </QueryStateHandler>
      )}
    </>
  );
}
