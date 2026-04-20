import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { API_ERROR_MESSAGES, type ApiErrorCodes } from '@sirena/common/constants';
import { Drawer } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';

import { forwardRef, useId, useImperativeHandle, useState } from 'react';
import { FileDropZone } from '@/components/common/FileDropZone';
import { SelectedFilesList } from '@/components/common/SelectedFilesList';
import { useAddProcessingStepNote } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { HttpError } from '@/lib/api/tanstackQuery';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './CreateNoteDrawer.module.css';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];
export type CreateNoteDrawerRef = {
  openDrawer: (step: StepType) => void;
  closeDrawer: () => void;
};
// biome-ignore lint/complexity/noBannedTypes: react doesn't handle well Record<string, never>
export type CreateNoteDrawerProps = {};

const REQUIRED_FIELDS_ERROR =
  'Vous devez renseigner au moins un champ : "Ajouter une note à l’étape" ou "Ajouter des pièces jointes".';
const NOTE_MAX_LENGTH = 10000;
const NOTE_MAX_LENGTH_ERROR =
  'Le champ "Ajouter une note à l\'étape" ne doit pas dépasser 10 000 caractères. Supprimer les caractères excédentaires.';

export const CreateNoteDrawer = forwardRef<CreateNoteDrawerRef, CreateNoteDrawerProps>((_props, ref) => {
  const { requestId } = useParams({
    from: '/_auth/_user/request/$requestId',
  });

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<StepType | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  const addStepNoteMutation = useAddProcessingStepNote(requestId);
  const uploadFileMutation = useUploadFile({ silentToastError: true });

  const generatedId = useId();
  const titleId = `${generatedId}-drawer`;

  const openDrawer = (step: StepType) => {
    handleCancel();
    setStep(step);
    setIsOpen(true);
  };

  const handleCancel = () => {
    setContent('');
    setFiles([]);
    setFileErrors({});
    setStep(null);
    setIsLoading(false);
    setErrorMessage(null);
    setContentError(null);
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
    if (!step) {
      return;
    }

    if (content.length > NOTE_MAX_LENGTH) {
      setContentError(NOTE_MAX_LENGTH_ERROR);
      setErrorMessage(null);
      return;
    }

    if (!content.trim().length && files.length === 0) {
      setContentError(REQUIRED_FIELDS_ERROR);
      setErrorMessage(REQUIRED_FIELDS_ERROR);
      return;
    }

    setContentError(null);
    setErrorMessage(null);

    const newFileErrors = validateFiles(files);

    if (Object.keys(newFileErrors).length > 0) {
      setFileErrors(newFileErrors);
      return;
    }

    setIsLoading(true);
    const stepId = step.id;
    const fileIds = [];
    if (files.length > 0) {
      try {
        const data = await Promise.all(files.map((file) => uploadFileMutation.mutateAsync(file)));
        for (let i = 0; i < data.length; i += 1) {
          fileIds.push(data[i].id);
        }
      } catch (error) {
        setIsLoading(false);
        if (error instanceof HttpError) {
          const errorName = error.data?.name;
          if (error.status === 400 && errorName && typeof errorName === 'string' && errorName in API_ERROR_MESSAGES) {
            setErrorMessage(API_ERROR_MESSAGES[errorName as ApiErrorCodes]);
            throw error;
          }
        }
        setErrorMessage("Une erreur est survenue lors de l'upload des fichiers. Veuillez réessayer.");
        throw error;
      }
    }

    addStepNoteMutation.mutate(
      { texte: content.trim(), id: stepId, fileIds },
      {
        onError: () => {
          setIsLoading(false);
          setErrorMessage("Une erreur est survenue lors de l'upload des fichiers. Veuillez réessayer.");
        },
        onSuccess: () => {
          handleCancel();
          setIsOpen(false);
        },
      },
    );
  };

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
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                  >
                    Fermer
                  </Button>
                </div>
                <h3 id={titleId} className="fr-h6">
                  Ajouter une note ou un fichier pour {step?.nom ?? ''}
                </h3>
                <p className="fr-text--sm fr-text--mention-grey fr-mb-2w">
                  Au moins une des informations suivantes doit être complétée.
                </p>
                <form>
                  <Input
                    hintText="Maximum 10 000 caractères"
                    label="Ajouter une note à l’étape"
                    textArea={true}
                    disabled={isLoading}
                    state={contentError ? 'error' : undefined}
                    stateRelatedMessage={contentError ?? undefined}
                    nativeTextAreaProps={{
                      rows: 8,
                      value: content,
                      onChange: (e) => {
                        const value = e.target.value;
                        setContent(value);

                        if (value.length > NOTE_MAX_LENGTH) {
                          setContentError(NOTE_MAX_LENGTH_ERROR);
                          setErrorMessage((prev) => (prev === REQUIRED_FIELDS_ERROR ? null : prev));
                          return;
                        }

                        if (contentError && value.trim().length > 0) {
                          setContentError(null);
                          setErrorMessage((prev) => (prev === REQUIRED_FIELDS_ERROR ? null : prev));
                        }
                      },
                    }}
                  />
                  <section className={styles.attachmentSection}>
                    <p className={`fr-label ${styles.attachmentTitle}`}>Ajouter des pièces jointes</p>
                    <FileDropZone
                      selectedFiles={files}
                      fileErrors={fileErrors}
                      errorMessage={errorMessage}
                      isUploading={isLoading}
                      onFilesSelect={(selectedFiles) => {
                        setFiles(selectedFiles.map((file) => new File([file], file.name, { type: file.type })));
                        setFileErrors({});
                        if (contentError && selectedFiles.length > 0) {
                          setContentError(null);
                          setErrorMessage((prev) => (prev === REQUIRED_FIELDS_ERROR ? null : prev));
                        }
                      }}
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
                    />
                  </section>
                  <div className={styles.footerActions}>
                    <Button
                      type="button"
                      priority="secondary"
                      size="small"
                      onClick={() => setIsOpen(false)}
                      disabled={isLoading}
                    >
                      Annuler
                    </Button>
                    <Button type="button" priority="primary" size="small" onClick={handleSubmit} disabled={isLoading}>
                      {isLoading ? 'En cours...' : 'Ajouter à l’étape'}
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
});
