import type { SituationData } from '@sirena/common/schemas';
import { useMutation } from '@tanstack/react-query';
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
  const saveMutation = useMutation({
    mutationFn: async ({
      data,
      faitFiles,
      initialFileIds,
    }: {
      data: SituationData;
      faitFiles: File[];
      initialFileIds?: string[];
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

      const existingFileIds = data.fait?.fileIds || [];
      const allFileIds = [...existingFileIds, ...newFaitFileIds];

      // Delete files that were removed
      if (situationId && previousFileIds.length > 0) {
        const filesToDelete = previousFileIds.filter((id) => !allFileIds.includes(id));
        if (filesToDelete.length > 0) {
          await Promise.allSettled(filesToDelete.map((fileId) => deleteUploadedFile(fileId)));
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
  ) => {
    await saveMutation.mutateAsync({ data, faitFiles, initialFileIds });
  };

  return {
    handleSave,
  };
};
