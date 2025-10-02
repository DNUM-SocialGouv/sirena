import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { ConflictResolutionDialog } from '@/components/conflictDialog/ConflictResolutionDialog';
import { DeclarantForm } from '@/components/declarant/DeclarantForm';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';
import { requireAuth } from '@/lib/auth-guards';
import { type ConflictInfo, detectAndMergeConflicts } from '@/lib/conflictResolution';
import { type DeclarantData, formatDeclarantFromServer } from '@/lib/declarant';
import { declarantFieldMetadata } from '@/lib/fieldMetadata';
import { toastManager } from '@/lib/toastManager';

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
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const originalDataRef = useRef<DeclarantData>({});
  const pendingDataRef = useRef<DeclarantData>({});

  const requestQuery = useQuery({
    queryKey: ['requete', requestId],
    queryFn: async () => {
      const response = await client['requetes-entite'][':id'].$get({
        param: { id: requestId },
      });
      await handleRequestErrors(response);
      const result = await response.json();
      return result.data;
    },
    enabled: !!requestId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: DeclarantData) => {
      const identiteUpdatedAt = requestQuery.data?.requete?.declarant?.identite?.updatedAt;

      const response = await client['requetes-entite'][':id'].declarant.$put({
        param: { id: requestId },
        json: {
          declarant: data,
          ...(identiteUpdatedAt && {
            controls: {
              declarant: {
                updatedAt: identiteUpdatedAt,
              },
            },
          }),
        },
      });

      if (!response.ok && response.status === 409) {
        const conflictData = await response.json();
        throw { status: 409, conflictData };
      }

      await handleRequestErrors(response);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      requestQuery.refetch();
      navigate({ to: '/request/$requestId', params: { requestId } });
    },
    onError: async (error: unknown) => {
      const err = error as { status?: number; conflictData?: { conflictData?: { serverData?: unknown } } };
      if (err?.status === 409) {
        const serverData = err.conflictData?.conflictData?.serverData;

        if (serverData) {
          const serverFormatted = formatDeclarantFromServer(serverData);
          const mergeResult = detectAndMergeConflicts(originalDataRef.current, pendingDataRef.current, serverFormatted);

          if (mergeResult.canAutoResolve) {
            toastManager.add({
              title: 'Fusion automatique',
              description: 'Les modifications ont été fusionnées automatiquement.',
              data: { icon: 'fr-alert--info' },
            });

            await requestQuery.refetch();

            saveMutation.mutate(mergeResult.merged);
          } else {
            setConflicts(mergeResult.conflicts);
            setShowConflictDialog(true);
          }
        } else {
          requestQuery.refetch();
          toastManager.add({
            title: 'Conflit de données',
            description: 'Les données ont été modifiées. La page a été rafraîchie.',
            data: { icon: 'fr-alert--warning' },
          });
        }
      } else if (error instanceof HttpError) {
        toastManager.add({
          title: 'Erreur',
          description: error.message || 'Une erreur est survenue lors de la sauvegarde.',
          data: { icon: 'fr-alert--error' },
        });
      }
    },
  });

  const handleSave = async (data: DeclarantData) => {
    pendingDataRef.current = data;
    await saveMutation.mutateAsync(data);
  };

  const handleConflictResolve = async (resolutions: Record<string, 'current' | 'server'>) => {
    const resolvedData = { ...pendingDataRef.current };

    conflicts.forEach((conflict) => {
      if (resolutions[conflict.field] === 'server') {
        (resolvedData as Record<string, unknown>)[conflict.field] = conflict.serverValue;
      }
    });

    setConflicts([]);
    setShowConflictDialog(false);

    await requestQuery.refetch();

    saveMutation.mutate(resolvedData);
  };

  const handleConflictCancel = () => {
    setConflicts([]);
    setShowConflictDialog(false);
    requestQuery.refetch();
  };

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
