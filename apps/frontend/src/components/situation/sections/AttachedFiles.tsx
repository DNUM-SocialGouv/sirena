import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import type { SituationData } from '@sirena/common/schemas';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { useProfile } from '@/hooks/queries/profile.hook';
import noteStyles from '@/routes/_auth/_user/request.$requestId.module.css';
import type { FileInfo } from '@/utils/fileHelpers';
import { ACCEPTED_FILE_TYPES, FILE_UPLOAD_HINT, formatFileSize } from '@/utils/fileHelpers';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './AttachedFiles.module.css';

type AttachedFilesProps = {
  formData: SituationData;
  situationId?: string;
  requestId?: string;
  faitFiles: File[];
  setFaitFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  isSaving: boolean;
};

export function AttachedFiles({
  formData,
  situationId,
  requestId,
  faitFiles,
  setFaitFiles,
  setFormData,
  isSaving,
}: AttachedFilesProps) {
  const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});
  const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { data: profile } = useProfile();

  const existingFiles = (formData.fait?.files || []) as FileInfo[];

  const deleteFileModal = useMemo(
    () =>
      createModal({
        id: 'delete-attached-file-modal',
        isOpenedByDefault: false,
      }),
    [],
  );

  const handleFileSelect = useCallback(
    (files: File[]) => {
      setFileErrors({});

      if (files.length === 0) {
        setFaitFiles([]);
        return;
      }

      const newFileErrors = validateFiles(files);
      if (Object.keys(newFileErrors).length > 0) {
        setFileErrors(newFileErrors);
        return;
      }

      setFaitFiles(files);
    },
    [setFaitFiles],
  );

  const handleDeleteExistingFile = (file: FileInfo, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFileToDelete(file);
    deleteFileModal.open();
  };

  const handleConfirmDeleteExistingFile = useCallback(() => {
    if (!fileToDelete) return;

    const fileId = fileToDelete.id;

    setFormData((prev) => {
      const currentFileIds = prev.fait?.fileIds || [];
      const currentFiles = prev.fait?.files || [];

      const newFileIds = currentFileIds.filter((id) => id !== fileId);
      const newFiles = currentFiles.filter((f) => f.id !== fileId);

      return {
        ...prev,
        fait: {
          ...prev.fait,
          fileIds: newFileIds,
          files: newFiles,
        },
      };
    });

    deleteFileModal.close();
    setFileToDelete(null);
  }, [fileToDelete, deleteFileModal, setFormData]);

  const handleDeleteSelectedFile = (fileToRemove: File, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFaitFiles((prev) => prev.filter((file) => file !== fileToRemove));
    // Clear file input if no files left
    if (faitFiles.length === 1 && uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  return (
    <div className={`fr-p-4w fr-mb-4w ${styles.container}`}>
      <h2 className="fr-h6 fr-mb-3w">Pièces jointes</h2>

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className={fr.cx('fr-mb-3w')} style={{ width: '100%' }}>
          <h4 className={fr.cx('fr-text--lg')}>Fichiers uploadés</h4>
          <div className={fr.cx('fr-mt-1w')} style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
            <ul>
              {existingFiles.map((file) => (
                <li key={file.id} className={noteStyles['request-note__file']}>
                  <div className={styles.fileItem}>
                    <div className={styles.fileName}>
                      <FileDownloadLink
                        href={
                          situationId && requestId
                            ? `/api/requetes-entite/${requestId}/situation/${situationId}/file/${file.id}`
                            : '#'
                        }
                        safeHref={
                          requestId && situationId
                            ? `/api/requetes-entite/${requestId}/situation/${situationId}/file/${file.id}/safe`
                            : undefined
                        }
                        fileName={file.fileName}
                        fileId={file.id}
                        fileSize={file.size}
                        status={file.status}
                        scanStatus={file.scanStatus}
                        sanitizeStatus={file.sanitizeStatus}
                        className={`${fr.cx('fr-link', 'fr-text--sm')} ${styles.fileNameLink}`}
                      />
                    </div>
                    {!isSaving && file.canDelete !== false && file.entiteId === profile?.topEntiteId && (
                      <Button
                        aria-label="Supprimer le fichier"
                        title="Supprimer le fichier"
                        type="button"
                        className={`${fr.cx('fr-btn', 'fr-btn--sm', 'fr-btn--tertiary', 'fr-icon-delete-line')} ${styles.deleteButton}`}
                        onClick={(event) => handleDeleteExistingFile(file, event)}
                      >
                        <span className={fr.cx('fr-sr-only')}>Supprimer le fichier</span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Selected files (not yet saved) */}
      {faitFiles.length > 0 && (
        <div className={fr.cx('fr-mb-3w')} style={{ width: '100%' }}>
          <h4 className={fr.cx('fr-text--lg')}>Nouveaux fichiers sélectionnés</h4>
          <div className={fr.cx('fr-mt-1w')} style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
            <ul>
              {faitFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className={noteStyles['request-note__file']}
                >
                  <div className={styles.fileItem}>
                    <div className={styles.fileName}>
                      <span className={fr.cx('fr-text--sm')}>
                        {file.name} ({formatFileSize(file.size)})
                      </span>
                    </div>
                    {!isSaving && (
                      <Button
                        aria-label="Supprimer le fichier"
                        title="Supprimer le fichier"
                        type="button"
                        className={`${fr.cx('fr-btn', 'fr-btn--sm', 'fr-btn--tertiary', 'fr-icon-delete-line')} ${styles.deleteButton}`}
                        onClick={(event) => handleDeleteSelectedFile(file, event)}
                      >
                        <span className={fr.cx('fr-sr-only')}>Supprimer le fichier</span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Upload component */}
      {!isSaving && (
        <Upload
          label="Ajouter des fichiers relatifs aux faits"
          hint={FILE_UPLOAD_HINT}
          multiple
          disabled={isSaving}
          nativeInputProps={{
            ref: uploadInputRef,
            accept: ACCEPTED_FILE_TYPES,
            onChange: (e) => {
              const files = e.target.files;
              if (files) {
                const fileArray = Array.from(files);
                handleFileSelect(fileArray.map((file) => new File([file], file.name, { type: file.type })));
              }
            },
          }}
        />
      )}

      {/* File validation errors */}
      {Object.keys(fileErrors).length > 0 && (
        <div className={fr.cx('fr-mt-2w')}>
          <h4 className={`${fr.cx('fr-text--sm', 'fr-text--bold')} ${styles.errorText}`}>Erreurs de validation</h4>
          {Object.entries(fileErrors).map(([fileName, errors]) => (
            <div key={fileName} className={fr.cx('fr-mb-1w')}>
              <p className={`${fr.cx('fr-text--sm', 'fr-text--bold')} ${styles.errorText}`}>{fileName}</p>
              {errors.map((error, index) => (
                <p
                  key={`${fileName}-error-${error.message}-${index}`}
                  className={`${fr.cx('fr-text--xs')} ${styles.errorText}`}
                >
                  {error.message}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <deleteFileModal.Component
        concealingBackdrop={false}
        title="Supprimer le fichier"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
            onClick: () => {
              deleteFileModal.close();
              setFileToDelete(null);
            },
          },
          {
            doClosesModal: false,
            children: 'Confirmer',
            onClick: handleConfirmDeleteExistingFile,
          },
        ]}
      >
        <p>Êtes-vous sûr de vouloir supprimer le fichier "{fileToDelete?.fileName}" ? Cette action est irréversible.</p>
      </deleteFileModal.Component>
    </div>
  );
}
