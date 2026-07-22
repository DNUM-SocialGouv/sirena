import { Button } from '@codegouvfr/react-dsfr/Button';
import { API_ERROR_MESSAGES, type ApiErrorCodes } from '@sirena/common/constants';
import { Drawer } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';

import { forwardRef, useCallback, useId, useImperativeHandle, useState } from 'react';
import { FileDropZone } from '@/components/common/FileDropZone';
import { SelectedFilesList } from '@/components/common/SelectedFilesList';
import { useAddClotureFiles } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import { HttpError } from '@/lib/api/tanstackQuery';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './AddFilesClotureDrawer.module.css';

export type AddFilesClotureDrawerRef = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

export type AddFilesClotureDrawerProps = {
  stepId: string;
};

export const AddFilesClotureDrawer = forwardRef<AddFilesClotureDrawerRef, AddFilesClotureDrawerProps>(
  ({ stepId }, ref) => {
    const { requestId } = useParams({
      from: '/_auth/_user/request/$requestId',
    });

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const addFilesMutation = useAddClotureFiles(requestId);
    const uploadFileMutation = useUploadFile({ silentToastError: true });

    const generatedId = useId();
    const titleId = `${generatedId}-drawer`;

    const openDrawer = () => {
      handleCancel();
      setIsOpen(true);
    };

    const handleCancel = () => {
      setFiles([]);
      setFileErrors({});
      setIsLoading(false);
      setErrorMessage(null);
    };

    const closeDrawer = () => {
      handleCancel();
      setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({
      openDrawer,
      closeDrawer,
    }));

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        handleCancel();
      }
      setIsOpen(open);
    };

    const handleSubmit = async () => {
      if (files.length === 0) {
        setErrorMessage('Vous devez sélectionner au moins un fichier.');
        return;
      }

      const newFileErrors = validateFiles(files);
      if (Object.keys(newFileErrors).length > 0) {
        setFileErrors(newFileErrors);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await Promise.all(files.map((file) => uploadFileMutation.mutateAsync(file)));
        const fileIds = data.map((f) => f.id);

        await addFilesMutation.mutateAsync({ stepId, fileIds });

        handleCancel();
        setIsOpen(false);
      } catch (error) {
        setIsLoading(false);
        if (error instanceof HttpError) {
          const errorName = error.data?.name;
          if (error.status === 400 && errorName && typeof errorName === 'string' && errorName in API_ERROR_MESSAGES) {
            setErrorMessage(API_ERROR_MESSAGES[errorName as ApiErrorCodes]);
            return;
          }
        }
        setErrorMessage("Une erreur est survenue lors de l'ajout des fichiers. Veuillez réessayer.");
      }
    };

    const handleClose = useCallback(() => setIsOpen(false), []);

    const handleFilesSelect = useCallback((selectedFiles: File[]) => {
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = selectedFiles
          .filter((f) => !existingNames.has(f.name))
          .map((f) => new File([f], f.name, { type: f.type }));
        return [...prev, ...newFiles];
      });
      setFileErrors({});
      setErrorMessage(null);
    }, []);

    const handleRemoveFile = useCallback((fileName: string) => {
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
    }, []);

    return (
      <Drawer.Root variant="nonModal" withCloseButton={false} open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Panel style={{ width: 'min(90vw, 600px)', maxWidth: '100%' }} titleId={titleId}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px 16px' }}>
                <div className="fr-container fr-mt-8w">
                  <div className={styles.topActions}>
                    <Button
                      type="button"
                      priority="tertiary no outline"
                      iconId="fr-icon-close-line"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      Fermer
                    </Button>
                  </div>
                  <h3 id={titleId} className="fr-h6">
                    Clôture
                  </h3>
                  <form>
                    <section className={styles.attachmentSection}>
                      <p className={`fr-label ${styles.attachmentTitle}`}>Ajouter des pièces jointes</p>
                      <FileDropZone
                        selectedFiles={files}
                        fileErrors={fileErrors}
                        errorMessage={errorMessage}
                        isUploading={isLoading}
                        onFilesSelect={handleFilesSelect}
                        title="Sélectionner ou glisser un fichier à joindre"
                        buttonLabel="Sélectionner un fichier"
                        className={styles.drawerDropZone}
                        errorTextClassName={styles.errorText}
                      />
                      <SelectedFilesList
                        files={files}
                        title="Fichiers sélectionnés"
                        className={styles.selectedFilesList}
                        variant="compact"
                        onRemove={handleRemoveFile}
                      />
                    </section>
                    <div className={styles.footerActions}>
                      <Button
                        type="button"
                        priority="secondary"
                        size="small"
                        onClick={handleClose}
                        disabled={isLoading}
                      >
                        Annuler
                      </Button>
                      <Button type="button" priority="primary" size="small" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'En cours...' : 'Ajouter à l\u2019étape'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
);
