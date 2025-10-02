import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ConflictResolutionDialog } from '@/components/conflictDialog/ConflictResolutionDialog';
import { DeclarantForm } from '@/components/declarant/DeclarantForm';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useDeclarantSave } from '@/hooks/mutations/useDeclarantSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuth } from '@/lib/auth-guards';
import { formatDeclarantFromServer } from '@/lib/declarant';
import { declarantFieldMetadata } from '@/lib/fieldMetadata';

export const Route = createFileRoute('/_auth/_user/request/$requestId/declarant')({
  beforeLoad: requireAuth,
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Déclarant - Édition requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const requestQuery = useRequeteDetails(requestId);

  const { handleSave, handleConflictResolve, handleConflictCancel, conflicts, showConflictDialog, originalDataRef } =
    useDeclarantSave({
      requestId,
      identiteUpdatedAt: requestQuery.data?.requete?.declarant?.identite?.updatedAt,
      onRefetch: () => requestQuery.refetch(),
    });

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const request = requestQuery.data;
        const declarant = request?.requete?.declarant;

        const formattedData = declarant ? formatDeclarantFromServer(declarant) : {};

        originalDataRef.current = formattedData;

        return (
          <>
            <DeclarantForm mode="edit" requestId={requestId} initialData={formattedData} onSave={handleSave} />
            {showConflictDialog && conflicts.length > 0 && (
              <ConflictResolutionDialog
                conflicts={conflicts}
                onResolve={handleConflictResolve}
                onCancel={handleConflictCancel}
                isOpen={showConflictDialog}
                fieldMetadata={declarantFieldMetadata}
              />
            )}
          </>
        );
      }}
    </QueryStateHandler>
  );
}
