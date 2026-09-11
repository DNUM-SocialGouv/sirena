import type { SituationData } from '@sirena/common/schemas';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '@/hooks/queries/profile.hook';
import { uploadFile } from '@/lib/api/fetchUploadedFiles';
import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';
import {
  type ConflictInfo,
  detectAndMergeConflicts,
  extractConflictPayload,
  flattenConflictPaths,
  MAX_AUTO_MERGE_REPLAYS,
  unflattenConflictPaths,
} from '@/lib/conflictResolution';
import { formatSituationFromServer } from '@/lib/situation';
import { toastManager } from '@/lib/toastManager';

type SituationPostResponse = Awaited<
  ReturnType<Awaited<ReturnType<(typeof client)['requetes-entite'][':id']['situation']['$post']>>['json']>
>;

type SituationPatchResponse = Awaited<
  ReturnType<
    Awaited<ReturnType<(typeof client)['requetes-entite'][':id']['situation'][':situationId']['$patch']>>['json']
  >
>;

type SituationFromServer = Parameters<typeof formatSituationFromServer>[0];

type FileWithEntite = { id: string; entiteId?: string | null };

export type SituationSaveResult = {
  requete: SituationPostResponse['data'] | SituationPatchResponse['data'];
  shouldCloseRequeteStatus:
    | SituationPostResponse['shouldCloseRequeteStatus']
    | SituationPatchResponse['shouldCloseRequeteStatus'];
};

interface UseSituationSaveProps {
  requestId: string;
  situationId?: string;
  situationUpdatedAt?: string | null;
  loadedData?: SituationData;
  onRefetch: () => void;
  onSuccess?: (result: SituationSaveResult) => void;
}

const uploadFaitFiles = async (faitFiles: File[]): Promise<string[]> => {
  if (faitFiles.length === 0) return [];

  const uploadedFaitFiles = await Promise.all(faitFiles.map((file) => uploadFile(file)));
  return uploadedFaitFiles.map((file) => file.id);
};

const buildEnrichedData = (
  data: SituationData,
  newFaitFileIds: string[],
  initialFiles: FileWithEntite[] | undefined,
  userTopEntiteId: string | null | undefined,
): SituationData => {
  // fileIds reflects the user deletions; initialFiles still carries the metadata of every original file.
  const existingFileIds = data.fait?.fileIds || [];
  const existingFiles = (data.fait?.files || []) as FileWithEntite[];
  const allInitialFiles = initialFiles || existingFiles;
  const fileEntiteMap = new Map(
    allInitialFiles.map((file) => [file.id, file.entiteId] as [string, string | null | undefined]),
  );

  const authorizedExistingFileIds = existingFileIds.filter((fileId) => {
    const fileEntiteId = fileEntiteMap.get(fileId);
    return !userTopEntiteId || fileEntiteId === userTopEntiteId;
  });

  const allFileIds = [...authorizedExistingFileIds, ...newFaitFileIds];

  return {
    ...data,
    fait: data.fait
      ? { ...data.fait, fileIds: allFileIds.length > 0 ? allFileIds : undefined }
      : allFileIds.length > 0
        ? { fileIds: allFileIds }
        : undefined,
  };
};

export const useSituationSave = ({
  requestId,
  situationId,
  situationUpdatedAt,
  loadedData,
  onRefetch,
  onSuccess,
}: UseSituationSaveProps) => {
  const { data: profile } = useProfile();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const originalDataRef = useRef<SituationData>({});
  const serverUpdatedAtRef = useRef<string | null>(null);
  const pendingDataRef = useRef<SituationData>({});
  const autoMergeReplaysRef = useRef(0);
  const pinnedUpdatedAtRef = useRef<string | null>(null);
  const isEditSessionPinnedRef = useRef(false);

  useEffect(() => {
    if (isEditSessionPinnedRef.current) return;
    if (!loadedData && !situationUpdatedAt) return;
    isEditSessionPinnedRef.current = true;
    pinnedUpdatedAtRef.current = situationUpdatedAt ?? null;
    if (loadedData) originalDataRef.current = loadedData;
  }, [situationUpdatedAt, loadedData]);

  const beginEditSession = useCallback(
    (data?: SituationData) => {
      isEditSessionPinnedRef.current = true;
      pinnedUpdatedAtRef.current = situationUpdatedAt ?? null;
      if (data) originalDataRef.current = data;
    },
    [situationUpdatedAt],
  );

  const releaseEditSession = () => {
    isEditSessionPinnedRef.current = false;
    pinnedUpdatedAtRef.current = situationUpdatedAt ?? null;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: SituationData): Promise<SituationSaveResult> => {
      const controlUpdatedAt = serverUpdatedAtRef.current ?? pinnedUpdatedAtRef.current ?? situationUpdatedAt;

      const response = situationId
        ? await client['requetes-entite'][':id'].situation[':situationId'].$patch({
            param: { id: requestId, situationId },
            json: {
              situation: data,
              ...(controlUpdatedAt && {
                controls: {
                  situation: {
                    updatedAt: controlUpdatedAt,
                  },
                },
              }),
            },
          })
        : // A creation has nothing to lock on: no version exists yet.
          await client['requetes-entite'][':id'].situation.$post({
            param: { id: requestId },
            json: {
              situation: data,
            },
          });

      if (!response.ok && response.status === 409) {
        const body = await response.json();
        throw { status: 409, body };
      }

      await handleRequestErrors(response);
      const result = await response.json();

      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        requete: result.data,
        shouldCloseRequeteStatus: result.shouldCloseRequeteStatus,
      };
    },
    onSuccess: (data) => {
      serverUpdatedAtRef.current = null;
      autoMergeReplaysRef.current = 0;
      releaseEditSession();
      onRefetch();
      onSuccess?.(data);
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

      const serverFormatted = formatSituationFromServer(serverData as SituationFromServer);
      const mergeResult = detectAndMergeConflicts(
        flattenConflictPaths(originalDataRef.current),
        flattenConflictPaths(pendingDataRef.current),
        flattenConflictPaths(serverFormatted),
      );
      const merged = unflattenConflictPaths(mergeResult.merged) as SituationData;

      if (!mergeResult.canAutoResolve) {
        pendingDataRef.current = merged;
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
      pendingDataRef.current = merged;
      originalDataRef.current = serverFormatted;
      saveMutation.mutate(merged);
    },
  });

  const handleSave = async (
    data: SituationData,
    _shouldCreateRequest: boolean,
    faitFiles: File[],
    _initialFileIds?: string[],
    initialFiles?: FileWithEntite[],
  ): Promise<void> => {
    // Uploaded before the mutation so the kept payload holds the file ids: a replay never re-uploads them.
    const newFaitFileIds = await uploadFaitFiles(faitFiles);
    const enrichedData = buildEnrichedData(data, newFaitFileIds, initialFiles, profile?.topEntiteId);

    pendingDataRef.current = enrichedData;
    autoMergeReplaysRef.current = 0;
    serverUpdatedAtRef.current = null;
    try {
      await saveMutation.mutateAsync(enrichedData);
    } catch (error) {
      if ((error as { status?: number } | null)?.status !== 409) {
        throw error;
      }
    }
  };

  const handleConflictResolve = async (resolutions: Record<string, 'current' | 'server'>) => {
    const resolvedFlat = flattenConflictPaths(pendingDataRef.current);

    conflicts.forEach((conflict) => {
      if (resolutions[conflict.field] === 'server') {
        resolvedFlat[conflict.field] = conflict.serverValue;
      }
    });

    const resolvedData = unflattenConflictPaths(resolvedFlat) as SituationData;

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
