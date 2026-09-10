import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import {
  type ConflictInfo,
  detectAndMergeConflicts,
  extractConflictPayload,
  MAX_AUTO_MERGE_REPLAYS,
} from '@/lib/conflictResolution';
import {
  formatPersonneConcerneeFromServer,
  formatPersonneConcerneeToServer,
  type PersonneConcerneeData,
} from '@/lib/personneConcernee';
import { toastManager } from '@/lib/toastManager';

interface UsePersonneConcerneeSaveProps {
  requestId: string;
  participantUpdatedAt?: string | null;
  loadedData?: PersonneConcerneeData;
  onRefetch: () => void;
}

export const usePersonneConcerneeSave = ({
  requestId,
  participantUpdatedAt,
  loadedData,
  onRefetch,
}: UsePersonneConcerneeSaveProps) => {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const originalDataRef = useRef<PersonneConcerneeData>({});
  const serverUpdatedAtRef = useRef<string | null>(null);
  const pendingDataRef = useRef<PersonneConcerneeData>({});
  const autoMergeReplaysRef = useRef(0);
  const pinnedUpdatedAtRef = useRef<string | null>(null);
  const isEditSessionPinnedRef = useRef(false);

  useEffect(() => {
    if (isEditSessionPinnedRef.current) return;
    if (!loadedData && !participantUpdatedAt) return;
    isEditSessionPinnedRef.current = true;
    pinnedUpdatedAtRef.current = participantUpdatedAt ?? null;
    if (loadedData) originalDataRef.current = loadedData;
  }, [participantUpdatedAt, loadedData]);

  const beginEditSession = useCallback(
    (data?: PersonneConcerneeData) => {
      isEditSessionPinnedRef.current = true;
      pinnedUpdatedAtRef.current = participantUpdatedAt ?? null;
      if (data) originalDataRef.current = data;
    },
    [participantUpdatedAt],
  );

  const releaseEditSession = () => {
    isEditSessionPinnedRef.current = false;
    pinnedUpdatedAtRef.current = participantUpdatedAt ?? null;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: PersonneConcerneeData) => {
      const controlUpdatedAt = serverUpdatedAtRef.current ?? pinnedUpdatedAtRef.current ?? participantUpdatedAt;

      const response = await client['requetes-entite'][':id'].participant.$patch({
        param: { id: requestId },
        json: {
          participant: formatPersonneConcerneeToServer(data),
          ...(controlUpdatedAt && {
            controls: {
              participant: {
                updatedAt: controlUpdatedAt,
              },
            },
          }),
        },
      });

      if (!response.ok && response.status === 409) {
        const body = await response.json();
        throw { status: 409, body };
      }

      await handleRequestErrors(response);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      serverUpdatedAtRef.current = null;
      autoMergeReplaysRef.current = 0;
      releaseEditSession();
      onRefetch();
      navigate({ to: '/request/$requestId', params: { requestId } });
    },
    onError: async (error: unknown) => {
      const err = error as { status?: number; body?: unknown };

      if (err?.status !== 409) {
        toastManager.add({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la sauvegarde.',
          data: { icon: 'fr-alert--error' },
        });
        return;
      }

      const { serverData, serverUpdatedAt } = extractConflictPayload(err.body);

      if (!serverUpdatedAt) {
        serverUpdatedAtRef.current = null;
        autoMergeReplaysRef.current = 0;
        onRefetch();
        toastManager.add({
          title: 'Conflit de données',
          description:
            'Les données ont été modifiées et la version du serveur est inexploitable. La page a été rafraîchie, vérifiez vos modifications avant de réessayer.',
          data: { icon: 'fr-alert--error' },
        });
        return;
      }

      serverUpdatedAtRef.current = serverUpdatedAt;

      if (!serverData) {
        onRefetch();
        toastManager.add({
          title: 'Conflit de données',
          description: 'Les données ont été modifiées. La page a été rafraîchie.',
          data: { icon: 'fr-alert--warning' },
        });
        return;
      }

      const serverFormatted = formatPersonneConcerneeFromServer(serverData);
      const mergeResult = detectAndMergeConflicts(
        originalDataRef.current as Record<string, unknown>,
        pendingDataRef.current as Record<string, unknown>,
        serverFormatted as Record<string, unknown>,
      );

      if (!mergeResult.canAutoResolve) {
        pendingDataRef.current = mergeResult.merged;
        setConflicts(mergeResult.conflicts);
        setShowConflictDialog(true);
        return;
      }

      if (autoMergeReplaysRef.current >= MAX_AUTO_MERGE_REPLAYS) {
        onRefetch();
        toastManager.add({
          title: 'Conflit persistant',
          description:
            'Les données continuent d’être modifiées par ailleurs. La page a été rafraîchie, vérifiez vos modifications avant de réessayer.',
          data: { icon: 'fr-alert--error' },
        });
        return;
      }

      autoMergeReplaysRef.current += 1;

      toastManager.add({
        title: 'Fusion automatique',
        description: 'Les modifications ont été fusionnées automatiquement.',
        data: { icon: 'fr-alert--info' },
      });

      onRefetch();
      pendingDataRef.current = mergeResult.merged;
      originalDataRef.current = serverFormatted;
      saveMutation.mutate(mergeResult.merged);
    },
  });

  const handleSave = async (data: PersonneConcerneeData) => {
    pendingDataRef.current = data;
    autoMergeReplaysRef.current = 0;
    serverUpdatedAtRef.current = null;
    try {
      await saveMutation.mutateAsync(data);
    } catch (error) {
      if ((error as { status?: number } | null)?.status !== 409) {
        throw error;
      }
    }
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
    pendingDataRef.current = resolvedData;
    autoMergeReplaysRef.current = 0;
    saveMutation.mutate(resolvedData);
  };

  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setConflicts([]);
    serverUpdatedAtRef.current = null;
    autoMergeReplaysRef.current = 0;
    releaseEditSession();
    onRefetch();
  };

  return {
    handleSave,
    handleConflictResolve,
    handleConflictCancel,
    beginEditSession,
    conflicts,
    showConflictDialog,
    originalDataRef,
  };
};
