import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { z } from 'zod';
import { ConflictResolutionDialog } from '@/components/conflictDialog/ConflictResolutionDialog';
import { DeclarantForm } from '@/components/declarant/DeclarantForm';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useDeclarantSave } from '@/hooks/mutations/useDeclarantSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { formatDeclarantFromServer } from '@/lib/declarant';
import { declarantFieldMetadata } from '@/lib/fieldMetadata';

export const Route = createFileRoute('/_auth/_user/request/$requestId/declarant')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `Déclarant - Édition requête ${params.requestId} - SIRENA`,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const requestQuery = useRequeteDetails(requestId);

  const declarant = requestQuery.data?.requete?.declarant;
  const formattedData = useMemo(() => (declarant ? formatDeclarantFromServer(declarant) : {}), [declarant]);

  const { handleSave, handleConflictResolve, handleConflictCancel, conflicts, showConflictDialog } = useDeclarantSave({
    requestId,
    identiteUpdatedAt: declarant?.identite?.updatedAt,
    // The edit session opens on the first load, not on the empty placeholder rendered before it.
    loadedData: declarant ? formattedData : undefined,
    onRefetch: () => requestQuery.refetch(),
  });

  return (
    <>
      <QueryStateHandler query={requestQuery}>
        {() => <DeclarantForm mode="edit" requestId={requestId} initialData={formattedData} onSave={handleSave} />}
      </QueryStateHandler>
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
        isOpen={showConflictDialog}
        fieldMetadata={declarantFieldMetadata}
      />
    </>
  );
}
