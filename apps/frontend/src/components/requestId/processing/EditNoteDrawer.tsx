import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { Drawer, Toast } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useDeleteProcessingStepNote, useUpdateProcessingStepNote } from '@/hooks/mutations/updateProcessingStep.hook';
import { useDeleteUploadedFile, useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type NoteFiles = {
  id: string;
  size: number;
  originalName: string;
};

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

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
};

export const EditNoteDrawer = forwardRef<EditNoteDrawerRef>((_props, ref) => {
  const { requestId } = useParams({
    from: '/_auth/_user/request/$requestId',
  });

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
  const [modifications, setModifications] = useState({
    content: false,
    filesAdded: false,
    filesDeleted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const updateNoteMutation = useUpdateProcessingStepNote(requestId);
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteUploadedFile();
  const deleteNoteMutation = useDeleteProcessingStepNote(requestId);

  const toastManager = Toast.useToastManager();

  const deleteNoteModal = createModal({
    id: 'delete-note-modal',
    isOpenedByDefault: false,
  });

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
    setContentError(null);
  };

  const handleDeleteNote = () => {
    deleteNoteModal.open();
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
  }));

  const handleSubmit = async () => {
    if (!noteData.step || !noteData.id || !noteData.requeteStateId) {
      return;
    }

    if (!noteData.content.trim()) {
      setContentError('Le contenu de la note est obligatoire');
      return;
    }

    setContentError(null);
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

    if (contentError && value.trim()) {
      setContentError(null);
    }
  };

  return (
    <>
      <Drawer.Root mask={false} open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Panel>
            <div
              className="fr-container fr-mt-8w"
              style={{ height: 'calc(100vh - 4rem)', overflowY: 'auto', paddingBottom: '2rem' }}
            >
              <h3 className="fr-h6">Modifier la note de l'étape "{noteData.step?.nom ?? ''}"</h3>
              {(modifications.content || modifications.filesAdded || modifications.filesDeleted) && (
                <div className="fr-alert fr-alert--warning fr-mb-2w">
                  <p className="fr-text--sm">
                    La note a été modifiée. Vous devez la sauvegarder pour prendre en compte les modifications.
                  </p>
                </div>
              )}
              <form>
                <Input
                  label="Détails de la note"
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
                  <div>
                    <span className="fr-label">Fichiers ajoutés</span>
                    <div className="fr-mt-1w">
                      {noteData.existingFiles.length > 0 && (
                        <ul>
                          {noteData.existingFiles.map((file) => (
                            <li key={file.id} className={styles['request-note__file']}>
                              <div>
                                <a
                                  href={`/api/requete-etapes/${noteData.requeteStateId}/file/${file.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="fr-link fr-text--sm"
                                  title={file.originalName}
                                >
                                  {file.originalName.length > 30
                                    ? `${file.originalName.slice(0, 20)}...`
                                    : file.originalName}
                                </a>
                                <button
                                  aria-label="Supprimer le fichier"
                                  type="button"
                                  className="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-delete-line fr-ml-2w"
                                  onClick={() => handleDeleteFile(file.id)}
                                >
                                  <span className="fr-sr-only">Supprimer le fichier</span>
                                </button>
                              </div>
                              <p className="fr-text--xs">
                                {file.originalName.split('.')?.[1]?.toUpperCase()} - {(file.size / 1024).toFixed(2)} Ko
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                <Upload
                  label="Ajouter un ou plusieurs fichiers"
                  hint="Taille maximale: 10 Mo. Formats supportés: .pdf, .png, .jpeg, .eml, .xlsx, .docx, .odt, .msg"
                  multiple
                  // disabled={isLoading}
                  // state={errorMessage ? 'error' : undefined}
                  // stateRelatedMessage={errorMessage ?? undefined}
                  className="relative"
                  nativeInputProps={{
                    accept: '.pdf,.png,.jpeg,.eml,.xlsx,.docx,.odt,.msg',
                    onChange: (e) => {
                      const files = e.target.files;
                      if (files) {
                        const fileArray = Array.from(files);
                        setFilesToUpload(fileArray.map((file) => new File([file], file.name, { type: file.type })));
                        setModifications((prev) => ({ ...prev, filesAdded: fileArray.length > 0 }));
                      }
                    },
                  }}
                />
                <div className="display-end fr-mt-4w">
                  <Button
                    type="button"
                    priority="secondary"
                    size="small"
                    onClick={handleDeleteNote}
                    className="fr-mr-2w"
                  >
                    Supprimer la note
                  </Button>
                  <Button
                    disabled={
                      (!modifications.content && !modifications.filesAdded && !modifications.filesDeleted) ||
                      isLoading ||
                      !noteData.content.trim()
                    }
                    onClick={handleSubmit}
                    type="button"
                    priority="primary"
                    size="small"
                  >
                    {isLoading ? 'Modification...' : 'Modifier la note'}
                  </Button>
                </div>
              </form>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
      <deleteNoteModal.Component
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
