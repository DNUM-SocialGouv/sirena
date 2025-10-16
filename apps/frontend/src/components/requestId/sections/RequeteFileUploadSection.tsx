import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCreateRequeteEntite } from '@/hooks/mutations/createRequeteEntite.hook';
import { useSetRequeteFile } from '@/hooks/mutations/setRequeteFile.hook';
import { useDeleteUploadedFile, useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import noteStyles from '@/routes/_auth/_user/request.$requestId.module.css';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './RequeteFileUploadSection.module.css';

// Toast messages
const TOAST_MESSAGES = {
  REQUEST_CREATED: {
    title: 'Requête créée',
    description: 'La requête a été créée avec succès.',
    icon: 'fr-alert--success' as const,
  },
  FILES_UPLOADED: {
    title: 'Fichiers uploadés',
    description: 'Les fichiers ont été uploadés avec succès.',
    icon: 'fr-alert--success' as const,
  },
  REQUEST_CREATED_WITH_UPLOAD_ERROR: {
    title: 'Requête créée',
    description: "La requête a été créée mais une erreur est survenue lors de l'upload des fichiers.",
    icon: 'fr-alert--warning' as const,
  },
  UPLOAD_ERROR: {
    title: 'Erreur',
    description: "Une erreur est survenue lors de l'upload des fichiers.",
    icon: 'fr-alert--error' as const,
  },
  CREATE_ERROR: {
    title: 'Erreur',
    description: 'Une erreur est survenue lors de la création de la requête.',
    icon: 'fr-alert--error' as const,
  },
  FILE_DELETED: {
    title: 'Fichier supprimé',
    description: 'Le fichier a été supprimé avec succès.',
    icon: 'fr-alert--success' as const,
  },
  DELETE_ERROR: {
    title: 'Erreur',
    description: 'Une erreur est survenue lors de la suppression du fichier.',
    icon: 'fr-alert--error' as const,
  },
} as const;

// Utility functions
const truncateFileName = (fileName: string, maxLength: number = 50, sliceLength: number = 30): string => {
  return fileName.length > maxLength ? `${fileName.slice(0, sliceLength)}...` : fileName;
};

interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
}

interface RequeteFileUploadProps {
  requeteId?: string;
  mode?: 'create' | 'edit';
  existingFiles?: UploadedFile[];
}

export function RequeteFileUploadSection({ requeteId, mode = 'edit', existingFiles = [] }: RequeteFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);
  const firstFileLinkRef = useRef<HTMLAnchorElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const toastManager = Toast.useToastManager();

  const { data: profile } = useQuery({ ...profileQueryOptions(), enabled: false });
  const uploadFileMutation = useUploadFile();
  const setRequeteFileMutation = useSetRequeteFile();
  const createRequeteMutation = useCreateRequeteEntite();
  const deleteFileMutation = useDeleteUploadedFile();

  const deleteFileModal = useMemo(
    () =>
      createModal({
        id: 'delete-file-modal',
        isOpenedByDefault: false,
      }),
    [],
  );

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      setSelectedFiles(files);
      setFileErrors({});

      if (files.length === 0) return;

      const newFileErrors = validateFiles(files);
      if (Object.keys(newFileErrors).length > 0) {
        setFileErrors(newFileErrors);
        return;
      }

      setIsUploading(true);
      let createdRequeteId = requeteId;

      try {
        // Create mode
        if (mode === 'create') {
          const createdRequete = await createRequeteMutation.mutateAsync({});
          createdRequeteId = createdRequete.id;
          toastManager.add({
            ...TOAST_MESSAGES.REQUEST_CREATED,
            data: { icon: TOAST_MESSAGES.REQUEST_CREATED.icon },
          });
        }

        // Upload files
        let uploadedFiles: UploadedFile[] = [];
        try {
          const uploadPromises = files.map((file) => uploadFileMutation.mutateAsync(file));
          uploadedFiles = await Promise.all(uploadPromises);
          setFiles((prev) => [...prev, ...uploadedFiles]);

          if (createdRequeteId) {
            const fileIds = uploadedFiles.map((file) => file.id);
            await setRequeteFileMutation.mutateAsync({ requeteId: createdRequeteId, fileIds });
            toastManager.add({
              ...TOAST_MESSAGES.FILES_UPLOADED,
              data: { icon: TOAST_MESSAGES.FILES_UPLOADED.icon },
            });
          }

          setSelectedFiles([]);
          setFileErrors({});

          // Clear the file input
          if (uploadInputRef.current) {
            uploadInputRef.current.value = '';
          }
        } catch (uploadError) {
          console.error("Erreur lors de l'upload:", uploadError);

          // If we are in create mode, redirect anyway
          if (mode === 'create' && createdRequeteId) {
            toastManager.add({
              ...TOAST_MESSAGES.REQUEST_CREATED_WITH_UPLOAD_ERROR,
              data: { icon: TOAST_MESSAGES.REQUEST_CREATED_WITH_UPLOAD_ERROR.icon },
            });
          } else {
            toastManager.add({
              ...TOAST_MESSAGES.UPLOAD_ERROR,
              data: { icon: TOAST_MESSAGES.UPLOAD_ERROR.icon },
            });
          }
        }

        // Redirect to the created request (after upload success or failure in create mode)
        if (mode === 'create' && createdRequeteId) {
          navigate({ to: '/request/$requestId', params: { requestId: createdRequeteId } });
        }
      } catch (createError) {
        console.error('Erreur lors de la création de la requête:', createError);
        toastManager.add({
          ...TOAST_MESSAGES.CREATE_ERROR,
          data: { icon: TOAST_MESSAGES.CREATE_ERROR.icon },
        });
      } finally {
        setIsUploading(false);
      }
    },
    [requeteId, mode, uploadFileMutation, setRequeteFileMutation, createRequeteMutation, navigate, toastManager],
  );

  const addModalEventListener = useCallback(() => {
    const handleModalClose = () => {
      setTimeout(() => {
        firstFileLinkRef.current?.focus();
      }, 100);
    };

    const checkForModal = () => {
      const modalElement = document.querySelector(`#${deleteFileModal.id}`);

      if (modalElement) {
        modalElement.addEventListener('dsfr.conceal', handleModalClose);

        cleanupRef.current = () => {
          modalElement.removeEventListener('dsfr.conceal', handleModalClose);
        };

        return true;
      }
      return false;
    };

    if (!checkForModal()) {
      setTimeout(checkForModal, 100);
    }
  }, [deleteFileModal.id]);

  const handleDeleteFile = (file: UploadedFile, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFileToDelete(file);
    deleteFileModal.open();
    setTimeout(addModalEventListener, 50);
  };

  const handleConfirmDeleteFile = useCallback(async () => {
    if (!fileToDelete) return;

    const fileId = fileToDelete.id;

    setFiles((prev) => prev.filter((file) => file.id !== fileId));

    try {
      await deleteFileMutation.mutateAsync(fileId);

      toastManager.add({
        ...TOAST_MESSAGES.FILE_DELETED,
        data: { icon: TOAST_MESSAGES.FILE_DELETED.icon },
      });

      deleteFileModal.close();
      setFileToDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);

      const fileToRestore = files.find((f) => f.id === fileId);
      if (fileToRestore) {
        setFiles((prev) => [...prev, fileToRestore]);
      }

      toastManager.add({
        ...TOAST_MESSAGES.DELETE_ERROR,
        data: { icon: TOAST_MESSAGES.DELETE_ERROR.icon },
      });

      deleteFileModal.close();
      setFileToDelete(null);
    }
  }, [fileToDelete, deleteFileMutation, files, toastManager, deleteFileModal]);

  return (
    <div className={`${fr.cx('fr-mb-3w')} ${styles.requeteFileUploadSection}`}>
      <h2 className={fr.cx('fr-h4')}>Requête originale</h2>
      {files.length > 0 && (
        <div className={fr.cx('fr-mt-3w')} style={{ width: '100%' }}>
          <h4 className={fr.cx('fr-text--lg')}>Fichiers uploadés</h4>
          <div className={fr.cx('fr-mt-1w')} style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
            <ul>
              {files.map((file, index) => {
                const originalName =
                  (file as UploadedFile & { metadata: { originalName?: string } }).metadata?.originalName || 'Unknown';

                return (
                  <li key={file.id} className={noteStyles['request-note__file']}>
                    <div className={styles.fileItem}>
                      <div className={styles.fileName}>
                        <a
                          ref={index === 0 ? firstFileLinkRef : undefined}
                          href={`/api/uploaded-files/${requeteId}/file/${file.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${fr.cx('fr-link', 'fr-text--sm')} ${styles.fileNameLink}`}
                          title={originalName}
                        >
                          {truncateFileName(originalName)}
                        </a>
                      </div>
                      {profile?.role?.id !== ROLES.READER && (
                        <Button
                          aria-label="Supprimer le fichier"
                          title="Supprimer le fichier"
                          type="button"
                          className={`${fr.cx('fr-btn', 'fr-btn--sm', 'fr-btn--tertiary', 'fr-icon-delete-line')} ${styles.deleteButton}`}
                          onClick={(event) => handleDeleteFile(file, event)}
                        >
                          <span className={fr.cx('fr-sr-only')}>Supprimer le fichier</span>
                        </Button>
                      )}
                    </div>
                    <p className={fr.cx('fr-text--xs')}>
                      {originalName.split('.')?.[1]?.toUpperCase()} - {(file.size / 1024).toFixed(2)} Ko
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {selectedFiles.length === 0 && mode === 'create' && (
        <p className={fr.cx('fr-text--sm', 'fr-text--light')}>Aucun fichier sélectionné.</p>
      )}
      {profile?.role?.id !== ROLES.READER && (
        <Upload
          label=""
          hint="Taille maximale: 10 Mo. Formats supportés: PDF, EML, Word, Excel, PowerPoint, OpenOffice, MSG, CSV, TXT, images (PNG, JPEG, HEIC, WEBP, TIFF)"
          multiple
          disabled={isUploading}
          nativeInputProps={{
            ref: uploadInputRef,
            accept:
              '.pdf,.eml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.msg,.csv,.txt,.png,.jpeg,.jpg,.heic,.heif,.webp,.tiff',
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
            onClick: handleConfirmDeleteFile,
          },
        ]}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer le fichier "
          {(fileToDelete as UploadedFile & { metadata: { originalName?: string } })?.metadata?.originalName}" ? Cette
          action est irréversible.
        </p>
      </deleteFileModal.Component>
    </div>
  );
}
