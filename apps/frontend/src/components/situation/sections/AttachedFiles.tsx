import type { SituationData } from '@sirena/common/schemas';
import { FileUploadSection } from '@/components/common/FileUploadSection';

type AttachedFilesProps = {
  formData: SituationData;
  situationId?: string;
  requestId?: string;
  faitFiles: File[];
  setFaitFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isSaving: boolean;
};

export function AttachedFiles({
  formData,
  situationId,
  requestId,
  faitFiles,
  setFaitFiles,
  isSaving,
}: AttachedFilesProps) {
  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <h2 className="fr-h6 fr-mb-3w">Pièces jointes</h2>
      <FileUploadSection
        label="Ajouter des fichiers relatifs aux faits"
        existingFiles={formData.fait?.files}
        getFileUrl={
          situationId && requestId
            ? (fileId) => `/api/requetes-entite/${requestId}/situation/${situationId}/file/${fileId}`
            : undefined
        }
        selectedFiles={faitFiles}
        onFilesChange={setFaitFiles}
        disabled={isSaving}
      />
    </div>
  );
}
