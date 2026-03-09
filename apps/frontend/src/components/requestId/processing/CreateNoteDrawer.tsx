import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { API_ERROR_MESSAGES, type ApiErrorCodes } from '@sirena/common/constants';
import { Drawer } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';

import { forwardRef, useId, useImperativeHandle, useState } from 'react';
import { useAddProcessingStepNote } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { HttpError } from '@/lib/api/tanstackQuery';
import { ACCEPTED_FILE_TYPES, FILE_UPLOAD_HINT } from '@/utils/fileHelpers';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './CreateNoteDrawer.module.css';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];
export type CreateNoteDrawerRef = {
  openDrawer: (step: StepType) => void;
};
// biome-ignore lint/complexity/noBannedTypes: react doesn't handle well Record<string, never>
export type CreateNoteDrawerProps = {};

const REQUIRED_FIELDS_ERROR = 'Vous devez renseigner "Détails de la note" ou ajouter un fichier pour créer la note.';

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

  useImperativeHandle(ref, () => ({
    openDrawer,
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
                  {step?.nom ?? ''}
                </h3>
                <p className="fr-text--sm fr-text--mention-grey fr-mb-2w">
                  Au moins un champ est obligatoire: "Détails de la note" ou un fichier.
                </p>
                <form>
                  <Input
                    hintText="Informations à ajouter"
                    label="Détails de la note"
                    textArea={true}
                    disabled={isLoading}
                    state={contentError ? 'error' : undefined}
                    stateRelatedMessage={contentError ?? undefined}
                    nativeTextAreaProps={{
                      rows: 8,
                      value: content,
                      onChange: (e) => {
                        setContent(e.target.value);
                        if (contentError && e.target.value.trim().length > 0) {
                          setContentError(null);
                          setErrorMessage((prev) => (prev === REQUIRED_FIELDS_ERROR ? null : prev));
                        }
                      },
                    }}
                  />
                  <Upload
                    label="Ajouter un ou plusieurs fichiers"
                    hint={FILE_UPLOAD_HINT}
                    multiple
                    disabled={isLoading}
                    state={errorMessage ? 'error' : undefined}
                    stateRelatedMessage={errorMessage ?? undefined}
                    className="relative"
                    nativeInputProps={{
                      accept: ACCEPTED_FILE_TYPES,
                      onChange: (e) => {
                        const files = e.target.files;
                        if (files) {
                          const fileArray = Array.from(files);
                          setFiles(fileArray.map((file) => new File([file], file.name, { type: file.type })));
                          setFileErrors({});
                          if (contentError && fileArray.length > 0) {
                            setContentError(null);
                            setErrorMessage((prev) => (prev === REQUIRED_FIELDS_ERROR ? null : prev));
                          }
                        }
                      },
                    }}
                  />
                  {files.length > 0 && (
                    <div className="fr-mt-2w">
                      <div className="fr-mt-1w">
                        {files.map((file) => (
                          <div key={file.name} className="fr-mb-1w">
                            {fileErrors[file.name] && (
                              <div className="fr-mt-1w">
                                <p className="fr-text--sm fr-text--bold" style={{ color: 'var(--text-default-error)' }}>
                                  {file.name}
                                </p>
                                {fileErrors[file.name].map((error, index) => (
                                  <p
                                    key={`${file.name}-error-${index}`}
                                    className="fr-text--xs"
                                    style={{ color: 'var(--text-default-error)' }}
                                  >
                                    {error.message}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={`fr-mt-2w ${styles.footerActions}`}>
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
                      {isLoading ? 'En cours...' : 'Ajouter la note'}
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
