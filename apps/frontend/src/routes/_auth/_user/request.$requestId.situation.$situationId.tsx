import { type ReceptionType, ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { ConflictResolutionDialog } from '@/components/conflictDialog/ConflictResolutionDialog';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CloseRequeteModal, type CloseRequeteModalRef } from '@/components/requestId/processing/CloseRequeteModal';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';

import { requireAuthAndRoles } from '@/lib/auth-guards';

import { situationFieldMetadata } from '@/lib/fieldMetadata';
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

  const situation = requestQuery.data?.requete?.situations?.find((s) => s.id === situationId);
  const formattedData = useMemo(() => formatSituationFromServer(situation), [situation]);

  const {
    handleSave: performSave,
    handleConflictResolve,
    handleConflictCancel,
    conflicts,
    showConflictDialog,
  } = useSituationSave({
    requestId,
    situationId,
    situationUpdatedAt: situation?.updatedAt,
    loadedData: situation ? formattedData : undefined,
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

  const handleCloseModalCancel = useCallback(async () => {
    setShouldCloseRequeteStatus(null);
    navigate({ to: '/request/$requestId', params: { requestId } });
  }, [navigate, requestId]);

  const handleBeforeClose = useCallback(async () => {
    navigate({ to: '/request/$requestId', params: { requestId } });
  }, [navigate, requestId]);

  const handleCloseModalSuccess = useCallback(() => {
    setShouldCloseRequeteStatus(null);
    navigate({ to: '/request/$requestId', params: { requestId } });
  }, [navigate, requestId]);

  const handleModalDismiss = useCallback(() => {
    setShouldCloseRequeteStatus(null);
  }, []);

  return (
    <>
      <QueryStateHandler query={requestQuery}>
        {({ data }) => {
          const receptionTypeId = data?.requete.receptionTypeId as ReceptionType | undefined;

          return (
            <>
              <SituationForm
                key={formResetKey}
                mode="edit"
                requestId={requestId}
                situationId={situationId}
                initialData={formattedData}
                receptionType={receptionTypeId}
                isFromSirec={data?.requete.sirecId != null}
                sirecDepartement={situation?.sirecDepartement}
                onSave={performSave}
                saveButtonRef={saveButtonRef}
              />
              <CloseRequeteModal
                ref={closeRequeteModalRef}
                requestId={requestId}
                otherEntitiesAffected={shouldCloseRequeteStatus?.otherEntitiesAffected ?? []}
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
      {/* Mounted outside the query gate: an arbitration must survive a refetch that briefly hides the form. */}
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
        isOpen={showConflictDialog}
        fieldMetadata={situationFieldMetadata}
      />
    </>
  );
}
