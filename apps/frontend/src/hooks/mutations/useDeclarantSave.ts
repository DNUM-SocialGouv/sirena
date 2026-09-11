import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';
import {
  type ConflictInfo,
  detectAndMergeConflicts,
  extractConflictPayload,
  MAX_AUTO_MERGE_REPLAYS,
} from '@/lib/conflictResolution';
import { type DeclarantData, formatDeclarantFromServer } from '@/lib/declarant';
import { toastManager } from '@/lib/toastManager';

interface UseDeclarantSaveProps {
  requestId: string;
  identiteUpdatedAt?: string | null;
  /** Server data currently displayed: pins the edit session as soon as it lands. */
  loadedData?: DeclarantData;
  onRefetch: () => void;
}

export const useDeclarantSave = ({ requestId, identiteUpdatedAt, loadedData, onRefetch }: UseDeclarantSaveProps) => {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const originalDataRef = useRef<DeclarantData>({});
  const serverUpdatedAtRef = useRef<string | null>(null);
  const pendingDataRef = useRef<DeclarantData>({});
  const autoMergeReplaysRef = useRef(0);
  const pinnedUpdatedAtRef = useRef<string | null>(null);
  const isEditSessionPinnedRef = useRef(false);

  // Pinned on the loaded version: following the query would slide the lock onto a version another user wrote.
  useEffect(() => {
    if (isEditSessionPinnedRef.current) return;
    if (!loadedData && !identiteUpdatedAt) return;
    isEditSessionPinnedRef.current = true;
    pinnedUpdatedAtRef.current = identiteUpdatedAt ?? null;
    if (loadedData) originalDataRef.current = loadedData;
  }, [identiteUpdatedAt, loadedData]);

  /** Pins the session on the displayed version, for callers whose edition starts on a user action rather than on load. */
  const beginEditSession = useCallback(
    (data?: DeclarantData) => {
      isEditSessionPinnedRef.current = true;
      pinnedUpdatedAtRef.current = identiteUpdatedAt ?? null;
      if (data) originalDataRef.current = data;
    },
    [identiteUpdatedAt],
  );

  // The reference is kept instead of cleared: until fresh data lands, the live value would reopen the same hole.
  const releaseEditSession = () => {
    isEditSessionPinnedRef.current = false;
    pinnedUpdatedAtRef.current = identiteUpdatedAt ?? null;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: DeclarantData) => {
      const controlUpdatedAt = serverUpdatedAtRef.current ?? pinnedUpdatedAtRef.current ?? identiteUpdatedAt;

      const response = await client['requetes-entite'][':id'].declarant.$patch({
        param: { id: requestId },
        json: {
          declarant: data,
          ...(controlUpdatedAt && {
            controls: {
              declarant: {
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
        if (error instanceof HttpError) {
          toastManager.add({
            title: 'Erreur',
            description: error.message || 'Une erreur est survenue lors de la sauvegarde.',
            data: { icon: 'fr-alert--error' },
          });
        }
        return;
      }

      const { serverData, serverUpdatedAt } = extractConflictPayload(err.body);

      // Falling back to the stale timestamp would conflict forever, so an unusable payload stops here.
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

      const serverFormatted = formatDeclarantFromServer(serverData);
      const mergeResult = detectAndMergeConflicts(originalDataRef.current, pendingDataRef.current, serverFormatted);

      if (!mergeResult.canAutoResolve) {
        // Arbitration rewrites only the conflicting fields, so it must start from the merged base.
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

  const handleSave = async (data: DeclarantData) => {
    pendingDataRef.current = data;
    autoMergeReplaysRef.current = 0;
    // A user-started save locks on the version it was loaded from, never on one an unarbitrated conflict carried.
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
    setConflicts([]);
    setShowConflictDialog(false);
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
