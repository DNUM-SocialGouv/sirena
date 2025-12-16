import type { ReceptionType } from '@sirena/common/constants';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import { type ConflictInfo, detectAndMergeConflicts } from '@/lib/conflictResolution';
import { toastManager } from '@/lib/toastManager';

type RequeteDateTypeData = {
  receptionDate?: string;
  receptionTypeId?: ReceptionType;
};

type UseRequeteDateTypeSaveProps = {
  requestId: string;
  requeteUpdatedAt?: string | null;
  onRefetch: () => void;
};

export const useRequeteDateTypeSave = ({ requestId, requeteUpdatedAt, onRefetch }: UseRequeteDateTypeSaveProps) => {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const originalDataRef = useRef<RequeteDateTypeData>({});
  const pendingDataRef = useRef<RequeteDateTypeData>({});

  const saveMutation = useMutation({
    mutationFn: async (data: RequeteDateTypeData) => {
      const response = await client['requetes-entite'][':id']['date-type'].$patch({
        param: { id: requestId },
        json: {
          ...data,
          ...(requeteUpdatedAt && {
            controls: {
              updatedAt: requeteUpdatedAt,
            },
          }),
        },
      });

      if (!response.ok && response.status === 409) {
        const conflictData = await response.json();
        throw { status: 409, conflictData };
      }

      await handleRequestErrors(response, { silentToastError: true });
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
          const mergeResult = detectAndMergeConflicts(
            originalDataRef.current as Record<string, unknown>,
            pendingDataRef.current as Record<string, unknown>,
            serverData as Record<string, unknown>,
          );

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
      } else {
        toastManager.add({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la sauvegarde.',
          data: { icon: 'fr-alert--error' },
        });
      }
    },
  });

  const handleSave = async (data: RequeteDateTypeData) => {
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
    setShowConflictDialog(false);
    setConflicts([]);
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
