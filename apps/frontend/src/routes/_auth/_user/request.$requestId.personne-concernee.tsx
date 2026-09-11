import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { z } from 'zod';
import { ConflictResolutionDialog } from '@/components/conflictDialog/ConflictResolutionDialog';
import { PersonneConcerneeForm } from '@/components/personneConcernee/PersonneConcerneeForm';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { usePersonneConcerneeSave } from '@/hooks/mutations/usePersonneConcerneeSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { personneConcerneeFieldMetadata } from '@/lib/fieldMetadata';
import { formatPersonneConcerneeFromServer } from '@/lib/personneConcernee';

export const Route = createFileRoute('/_auth/_user/request/$requestId/personne-concernee')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `Personne concernée - Édition requête ${params.requestId} - SIRENA`,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const requestQuery = useRequeteDetails(requestId);

  const participant = requestQuery.data?.requete?.participant;
  const formattedData = useMemo(
    () => (participant ? formatPersonneConcerneeFromServer(participant) : {}),
    [participant],
  );

  const { handleSave, handleConflictResolve, handleConflictCancel, conflicts, showConflictDialog } =
    usePersonneConcerneeSave({
      requestId,
      participantUpdatedAt: participant?.identite?.updatedAt,
      loadedData: participant ? formattedData : undefined,
      onRefetch: () => requestQuery.refetch(),
    });

  return (
    <>
      <QueryStateHandler query={requestQuery}>
        {() => (
          <PersonneConcerneeForm mode="edit" requestId={requestId} initialData={formattedData} onSave={handleSave} />
        )}
      </QueryStateHandler>
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
        isOpen={showConflictDialog}
        fieldMetadata={personneConcerneeFieldMetadata}
      />
    </>
  );
}
