import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';
import { type ConflictInfo, detectAndMergeConflicts } from '@/lib/conflictResolution';
import { type DeclarantData, formatDeclarantFromServer } from '@/lib/declarant';
import { toastManager } from '@/lib/toastManager';

interface UseDeclarantSaveProps {
  requestId: string;
  identiteUpdatedAt?: string | null;
  onRefetch: () => void;
}

export const useDeclarantSave = ({ requestId, identiteUpdatedAt, onRefetch }: UseDeclarantSaveProps) => {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const originalDataRef = useRef<DeclarantData>({});
  const pendingDataRef = useRef<DeclarantData>({});

  const saveMutation = useMutation({
    mutationFn: async (data: DeclarantData) => {
      const response = await client['requetes-entite'][':id'].declarant.$patch({
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
      onRefetch();
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

            onRefetch();
            saveMutation.mutate(mergeResult.merged);
          } else {
            setConflicts(mergeResult.conflicts);
            setShowConflictDialog(true);
          }
        } else {
          onRefetch();
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
    onRefetch();
    saveMutation.mutate(resolvedData);
  };

  const handleConflictCancel = () => {
    setConflicts([]);
    setShowConflictDialog(false);
    onRefetch();
  };

  return {
    handleSave,
    handleConflictResolve,
    handleConflictCancel,
    conflicts,
    showConflictDialog,
    originalDataRef,
  };
};
