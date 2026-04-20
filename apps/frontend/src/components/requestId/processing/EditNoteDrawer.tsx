import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Drawer, Toast } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { FileDropZone } from '@/components/common/FileDropZone';
import { SelectedFilesList } from '@/components/common/SelectedFilesList';
import { useDeleteProcessingStepNote, useUpdateProcessingStepNote } from '@/hooks/mutations/updateProcessingStep.hook';
import { useDeleteUploadedFile, useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './EditNoteDrawer.module.css';

type NoteFiles = {
  id: string;
  size: number;
  originalName: string;
  status?: string;
  scanStatus?: string;
  sanitizeStatus?: string;
  safeFilePath?: string | null;
};

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];
const NOTE_MAX_LENGTH = 10000;
const NOTE_MAX_LENGTH_ERROR =
  'Le champ "Ajouter une note à l\'étape" ne doit pas dépasser 10 000 caractères. Supprimer les caractères excédentaires.';

export type EditNoteDrawerRef = {
  openDrawer: (
    step: StepType,
    noteData: {
      requeteStateId: string;
      id: string;
      content: string;
      files: NoteFiles[];
    },
  ) => void;
  closeDrawer: () => void;
};

export const EditNoteDrawer = forwardRef<EditNoteDrawerRef>((_props, ref) => {
  const { requestId } = useParams({
    from: '/_auth/_user/request/$requestId',
  });

  const generatedId = useId();
  const titleId = `${generatedId}-drawer`;

  const [isOpen, setIsOpen] = useState(false);
  const [noteData, setNoteData] = useState<{
    step: StepType | null;
    id: string | null;
    requeteStateId: string | null;
    content: string;
    existingFiles: NoteFiles[];
  }>({
    step: null,
    id: null,
    requeteStateId: null,
    content: '',
    existingFiles: [],
  });
  const [fileIdsToDelete, setFileIdsToDelete] = useState<string[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});
  const [modifications, setModifications] = useState({
    content: false,
    filesAdded: false,
    filesDeleted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const updateNoteMutation = useUpdateProcessingStepNote(requestId);
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteUploadedFile({ requeteId: requestId });
  const deleteNoteMutation = useDeleteProcessingStepNote(requestId);

  const toastManager = Toast.useToastManager();

  const deleteNoteModal = createModal({
    id: 'delete-note-modal',
    isOpenedByDefault: false,
  });

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const addModalEventListener = () => {
    const handleModalClose = () => {
      setTimeout(() => {
        deleteButtonRef.current?.focus();
      }, 100);
    };

    const checkForModal = () => {
      const modalElement = document.querySelector(`#${deleteNoteModal.id}`);

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
      setTimeout(() => {
        checkForModal();
      }, 100);
    }
  };

  const openDrawer = (
    step: StepType,
    noteData: {
      requeteStateId: string;
      id: string;
      content: string;
      files: NoteFiles[];
    },
  ) => {
    handleCancel();
    setNoteData({
      step,
      id: noteData.id,
      requeteStateId: noteData.requeteStateId,
      content: noteData.content,
      existingFiles: noteData.files,
    });
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
    setIsOpen(open);
  };

  const handleCancel = () => {
    setModifications({
      content: false,
      filesAdded: false,
      filesDeleted: false,
    });
    setFileIdsToDelete([]);
    setFilesToUpload([]);
    setFileErrors({});
    setContentError(null);
  };

  const closeDrawer = () => {
    handleCancel();
    setIsOpen(false);
  };

  const handleDeleteNote = () => {
    deleteNoteModal.open();
    setTimeout(() => {
      addModalEventListener();
    }, 50);
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteData.step || !noteData.id || !noteData.requeteStateId) {
      return;
    }

    try {
      await deleteNoteMutation.mutateAsync({
        id: noteData.requeteStateId,
        noteId: noteData.id,
      });

      toastManager.add({
        title: 'Note supprimée',
        description: 'La note a été supprimée avec succès.',
        data: { icon: 'fr-alert--success' },
      });

      setIsOpen(false);
      handleCancel();
      deleteNoteModal.close();
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression de la note.',
        data: { icon: 'fr-alert--error' },
      });
    }
  };

  useImperativeHandle(ref, () => ({
    openDrawer,
    closeDrawer,
  }));

  const handleSubmit = async () => {
    if (!modifications.content && !modifications.filesAdded && !modifications.filesDeleted) {
      return;
    }

    if (!noteData.step || !noteData.id || !noteData.requeteStateId) {
      return;
    }

    if (noteData.content.length > NOTE_MAX_LENGTH) {
      setContentError(NOTE_MAX_LENGTH_ERROR);
      return;
    }

    setContentError(null);

    const newFileErrors = validateFiles(filesToUpload);

    if (Object.keys(newFileErrors).length > 0) {
      setFileErrors(newFileErrors);
      return;
    }

    setIsLoading(true);

    try {
      // 1 - Upload new files
      const newFileIds: string[] = [];
      if (filesToUpload.length > 0) {
        const uploadPromises = filesToUpload.map((file) => uploadFileMutation.mutateAsync(file));
        const uploadResults = await Promise.all(uploadPromises);
        newFileIds.push(...uploadResults.map((result) => result.id));
      }

      // 2 - Delete files
      if (fileIdsToDelete.length > 0) {
        const deletePromises = fileIdsToDelete.map((fileId) => deleteFileMutation.mutateAsync(fileId));
        await Promise.all(deletePromises);
      }

      // 3 - Update note content/attach new files
      if (modifications.content || newFileIds.length > 0) {
        await updateNoteMutation.mutateAsync({
          noteId: noteData.id,
          texte: noteData.content,
          fileIds: newFileIds,
        });
      }

      toastManager.add({
        title: 'Note modifiée',
        description: 'La note a été modifiée avec succès.',
        data: { icon: 'fr-alert--success' },
      });

      // Reset
      setIsOpen(false);
      setModifications({
        content: false,
        filesAdded: false,
        filesDeleted: false,
      });
      setFileIdsToDelete([]);
      setFilesToUpload([]);
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour de la note.',
        data: { icon: 'fr-alert--error' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setNoteData((prev) => ({
      ...prev,
      existingFiles: prev.existingFiles.filter((file) => file.id !== fileId),
    }));
    setFileIdsToDelete((prev) => [...prev, fileId]);
    setModifications((prev) => ({ ...prev, filesDeleted: true }));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNoteData((prev) => ({
      ...prev,
      content: value,
    }));
    setModifications((prev) => ({ ...prev, content: true }));

    if (value.length > NOTE_MAX_LENGTH) {
      setContentError(NOTE_MAX_LENGTH_ERROR);
      return;
    }

    if (contentError && value.trim()) {
      setContentError(null);
    }
  };

  return (
    <>
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
                    Modifier la note pour {noteData.step?.nom ?? ''}
                  </h3>
                  {(modifications.content || modifications.filesAdded || modifications.filesDeleted) && (
                    <p className={`${fr.cx('fr-text--sm', 'fr-mb-2w')} ${styles.modificationWarning}`}>
                      ⚠️ Attention : Vous devez enregistrer la note pour que les modifications soient prises en compte.
                    </p>
                  )}
                  <form>
                    <Input
                      hintText="Maximum 10 000 caractères"
                      label="Ajouter une note à l’étape"
                      disabled={isLoading}
                      textArea={true}
                      state={contentError ? 'error' : undefined}
                      stateRelatedMessage={contentError ?? undefined}
                      nativeTextAreaProps={{
                        rows: 8,
                        value: noteData.content,
                        onChange: handleContentChange,
                      }}
                    />

                    {noteData.existingFiles.length > 0 && (
                      <section className={styles.attachmentSection}>
                        <p className={`fr-label ${styles.attachmentTitle}`}>Fichiers déjà ajoutés</p>
                        <div className={styles.attachmentCard}>
                          <ul className={styles.existingFilesList}>
                            {noteData.existingFiles.map((file) => (
                              <li key={file.id} className={styles.existingFileItem}>
                                <div className={styles.existingFileHeader}>
                                  <FileDownloadLink
                                    href={`/api/requete-etapes/${noteData.requeteStateId}/file/${file.id}`}
                                    safeHref={`/api/requete-etapes/${noteData.requeteStateId}/file/${file.id}/safe`}
                                    fileName={file.originalName}
                                    fileId={file.id}
                                    fileSize={file.size}
                                    status={file.status}
                                    scanStatus={file.scanStatus}
                                    sanitizeStatus={file.sanitizeStatus}
                                    className={`${fr.cx('fr-link', 'fr-text--sm')} ${styles.fileNameLink}`}
                                  />
                                  <Button
                                    aria-label="Supprimer le fichier"
                                    title="Supprimer le fichier"
                                    type="button"
                                    className={`${fr.cx('fr-btn', 'fr-btn--sm', 'fr-btn--tertiary', 'fr-icon-delete-line')} ${styles.deleteButton}`}
                                    onClick={() => handleDeleteFile(file.id)}
                                  >
                                    <span className={fr.cx('fr-sr-only')}>Supprimer le fichier</span>
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    )}
                    <section className={styles.attachmentSection}>
                      <p className={`fr-label ${styles.attachmentTitle}`}>Ajouter des pièces jointes</p>
                      <FileDropZone
                        selectedFiles={filesToUpload}
                        fileErrors={fileErrors}
                        isUploading={isLoading}
                        onFilesSelect={(selectedFiles) => {
                          setFilesToUpload(
                            selectedFiles.map((file) => new File([file], file.name, { type: file.type })),
                          );
                          setModifications((prev) => ({ ...prev, filesAdded: selectedFiles.length > 0 }));
                          setFileErrors({});
                        }}
                        title="Sélectionner ou glisser un fichier à joindre"
                        buttonLabel="Sélectionner un fichier"
                        className={styles.drawerDropZone}
                        errorTextClassName={styles.errorText}
                      />
                      <SelectedFilesList
                        files={filesToUpload}
                        title="Fichiers sélectionnés"
                        className={styles.selectedFilesList}
                        variant="compact"
                      />
                    </section>
                    <div className={styles.footerActions}>
                      <Button
                        ref={deleteButtonRef}
                        type="button"
                        priority="secondary"
                        size="small"
                        onClick={handleDeleteNote}
                        aria-label="Supprimer la note"
                        title="Supprimer la note"
                      >
                        Supprimer la note
                      </Button>
                      <div className={styles.footerRightActions}>
                        <Button
                          type="button"
                          priority="secondary"
                          size="small"
                          onClick={() => setIsOpen(false)}
                          disabled={isLoading}
                        >
                          Annuler
                        </Button>
                        <Button
                          disabled={isLoading}
                          onClick={handleSubmit}
                          type="button"
                          priority="primary"
                          size="small"
                          aria-label="Modifier la note"
                          title="Modifier la note"
                        >
                          {isLoading ? 'En cours...' : 'Modifier la note'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
      <deleteNoteModal.Component
        concealingBackdrop={false}
        title="Supprimer la note"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
          },
          {
            doClosesModal: false,
            children: 'Confirmer',
            onClick: handleConfirmDeleteNote,
          },
        ]}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer cette note ? La suppression de la note entraîne la suppression du texte et
          fichiers liés à cette note.
        </p>
      </deleteNoteModal.Component>
    </>
  );
});
