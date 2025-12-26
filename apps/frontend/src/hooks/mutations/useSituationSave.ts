import type { SituationData } from '@sirena/common/schemas';
import { useMutation } from '@tanstack/react-query';
import { useProfile } from '@/hooks/queries/profile.hook';
import { deleteUploadedFile, uploadFile } from '@/lib/api/fetchUploadedFiles';
import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';
import { toastManager } from '@/lib/toastManager';

interface UseSituationSaveProps {
  requestId: string;
  situationId?: string;
  onRefetch: () => void;
  onSuccess?: () => void;
}

export const useSituationSave = ({ requestId, situationId, onRefetch, onSuccess }: UseSituationSaveProps) => {
  const { data: profile } = useProfile();
  const saveMutation = useMutation({
    mutationFn: async ({
      data,
      faitFiles,
      initialFileIds,
      initialFiles,
    }: {
      data: SituationData;
      faitFiles: File[];
      initialFileIds?: string[];
      initialFiles?: Array<{ id: string; entiteId?: string | null }>;
    }) => {
      // Get existing files before update (for deletion)
      let previousFileIds: string[] = [];
      if (situationId && initialFileIds) {
        previousFileIds = initialFileIds;
      }

      const newFaitFileIds: string[] = [];
      if (faitFiles.length > 0) {
        const uploadedFaitFiles = await Promise.all(faitFiles.map((file) => uploadFile(file)));
        newFaitFileIds.push(...uploadedFaitFiles.map((file) => file.id));
      }

      // Get fileIds from formData (which reflects user deletions) and filter by user rights
      const existingFileIds = data.fait?.fileIds || [];
      const existingFiles = (data.fait?.files || []) as Array<{ id: string; entiteId?: string | null }>;
      const userTopEntiteId = profile?.topEntiteId;

      // Use initialFiles (all files before any deletion) to have complete metadata for deleted files
      const allInitialFiles = (initialFiles || existingFiles) as Array<{ id: string; entiteId?: string | null }>;
      const fileEntiteMap = new Map(
        allInitialFiles.map((file) => [file.id, file.entiteId] as [string, string | null | undefined]),
      );

      // Filter existing fileIds to only include those the user has rights on (same topEntiteId)
      // and that are still in fileIds (not deleted by user)
      const authorizedExistingFileIds = existingFileIds.filter((fileId) => {
        const fileEntiteId = fileEntiteMap.get(fileId);
        return !userTopEntiteId || fileEntiteId === userTopEntiteId;
      });

      const allFileIds = [...authorizedExistingFileIds, ...newFaitFileIds];

      // Delete files that were removed (only files the user has rights on)
      if (situationId && previousFileIds.length > 0) {
        const filesRemovedByUser = previousFileIds.filter((id) => !allFileIds.includes(id));

        const filesToDelete = filesRemovedByUser.filter((fileId) => {
          const fileEntiteId = fileEntiteMap.get(fileId);
          return !userTopEntiteId || fileEntiteId === userTopEntiteId;
        });

        if (filesToDelete.length > 0) {
          // Wait for all deletions to complete before continuing
          await Promise.all(filesToDelete.map((fileId) => deleteUploadedFile(fileId)));
        }
      }

      const enrichedData: SituationData = {
        ...data,
        fait: data.fait
          ? { ...data.fait, fileIds: allFileIds.length > 0 ? allFileIds : undefined }
          : allFileIds.length > 0
            ? { fileIds: allFileIds }
            : undefined,
      };

      const response = situationId
        ? await client['requetes-entite'][':id'].situation[':situationId'].$patch({
            param: { id: requestId, situationId },
            json: {
              situation: enrichedData,
            },
          })
        : await client['requetes-entite'][':id'].situation.$post({
            param: { id: requestId },
            json: {
              situation: enrichedData,
            },
          });

      await handleRequestErrors(response);
      const result = await response.json();

      await new Promise((resolve) => setTimeout(resolve, 100));

      return result.data;
    },
    onSuccess: () => {
      onRefetch();
      onSuccess?.();
    },
    onError: async (error: unknown) => {
      if (error instanceof HttpError) {
        toastManager.add({
          title: 'Erreur',
          description: error.message || 'Une erreur est survenue lors de la sauvegarde.',
          data: { icon: 'fr-alert--error' },
        });
      }
    },
  });

  const handleSave = async (
    data: SituationData,
    _shouldCreateRequest: boolean,
    faitFiles: File[],
    initialFileIds?: string[],
    initialFiles?: Array<{ id: string; entiteId?: string | null }>,
  ) => {
    await saveMutation.mutateAsync({ data, faitFiles, initialFileIds, initialFiles });
  };

  return {
    handleSave,
  };
};
