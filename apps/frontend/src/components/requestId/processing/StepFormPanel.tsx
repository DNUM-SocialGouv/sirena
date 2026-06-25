import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { Drawer, Toast } from '@sirena/ui';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { FileDropZone } from '@/components/common/FileDropZone';
import { SelectedFilesList } from '@/components/common/SelectedFilesList';
import {
  useAddProcessingStep,
  useDeleteProcessingStep,
  useUpdateProcessingStep,
} from '@/hooks/mutations/updateProcessingStep.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import type { ProcessingStepStatut } from '@/lib/api/processingSteps';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';
import styles from './StepFormPanel.module.css';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

export type StepFormPanelRef = {
  openCreate: () => void;
  openEdit: (step: StepType) => void;
  closeDrawer: () => void;
};

type StepFormPanelProps = {
  requestId: string;
};

type EditableNote = {
  key: string;
  id?: string;
  texte: string;
  createdAt?: string;
};

type ReadOnlyNote = {
  id: string;
  texte: string;
  createdAt?: string;
};

type ExistingFile = {
  id: string;
  originalName: string;
  size: number;
  status?: string;
  scanStatus?: string;
  sanitizeStatus?: string;
  safeFilePath?: string | null;
  canDelete: boolean;
};

const NOTE_MAX_LENGTH = 10000;
const NOTE_MAX_LENGTH_ERROR = 'Le texte de la note ne doit pas dépasser 10 000 caractères.';
const NOM_REQUIRED_ERROR = "Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape.";
const DATE_REQUIRED_ERROR = 'La date de réalisation est obligatoire lorsque le statut est « Fait ».';

let noteKeySeq = 0;
const nextNoteKey = () => {
  noteKeySeq += 1;
  return `note-${noteKeySeq}`;
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toInputDate = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatLocalDate(date);
};

const todayInputDate = () => formatLocalDate(new Date());

const formatNoteDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

const getOriginalName = (metadata: unknown): string =>
  (metadata as { originalName?: string })?.originalName || 'Fichier';

const deleteStepModal = createModal({ id: 'step-form-panel-delete', isOpenedByDefault: false });

export const StepFormPanel = forwardRef<StepFormPanelRef, StepFormPanelProps>(({ requestId }, ref) => {
  const generatedId = useId();
  const titleId = `${generatedId}-step-form`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editStepId, setEditStepId] = useState<string | null>(null);
  const [ackNotesOnly, setAckNotesOnly] = useState(false);

  const [nom, setNom] = useState('');
  const [nomError, setNomError] = useState<string | null>(null);
  const [statutId, setStatutId] = useState<ProcessingStepStatut | null>(null);
  const [dateRealisation, setDateRealisation] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const [notes, setNotes] = useState<EditableNote[]>([]);
  const [readOnlyNotes, setReadOnlyNotes] = useState<ReadOnlyNote[]>([]);

  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addStepMutation = useAddProcessingStep(requestId);
  const updateStepMutation = useUpdateProcessingStep(requestId);
  const deleteStepMutation = useDeleteProcessingStep(requestId);
  const uploadFileMutation = useUploadFile({ silentToastError: true });
  const toastManager = Toast.useToastManager();

  const resetForm = () => {
    setNom('');
    setNomError(null);
    setStatutId(null);
    setDateRealisation('');
    setDateError(null);
    setNotes([]);
    setReadOnlyNotes([]);
    setExistingFiles([]);
    setFilesToUpload([]);
    setFileErrors({});
    setErrorMessage(null);
    setIsLoading(false);
  };

  const openCreate = () => {
    triggerElementRef.current = (document.activeElement as HTMLElement) ?? null;
    resetForm();
    setMode('create');
    setEditStepId(null);
    setAckNotesOnly(false);
    setNotes([{ key: nextNoteKey(), texte: '' }]);
    setIsOpen(true);
  };

  const openEdit = (step: StepType) => {
    if (!step.editable) return;
    triggerElementRef.current = (document.activeElement as HTMLElement) ?? null;
    resetForm();
    setMode('edit');
    setEditStepId(step.id);
    setAckNotesOnly(step.ackNotesOnly);
    setNom(step.nom);

    const initialStatut =
      step.statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT
        ? REQUETE_ETAPE_STATUT_TYPES.FAIT
        : step.statutId === REQUETE_ETAPE_STATUT_TYPES.A_FAIRE
          ? REQUETE_ETAPE_STATUT_TYPES.A_FAIRE
          : null;
    setStatutId(initialStatut);
    setDateRealisation(
      step.dateRealisation
        ? toInputDate(step.dateRealisation as unknown as string)
        : initialStatut === REQUETE_ETAPE_STATUT_TYPES.FAIT
          ? todayInputDate()
          : '',
    );

    setNotes(
      step.notes
        .filter((note) => note.author !== null)
        .map((note) => ({ key: nextNoteKey(), id: note.id, texte: note.texte, createdAt: note.createdAt })),
    );
    setReadOnlyNotes(
      step.notes
        .filter((note) => note.author === null)
        .map((note) => ({ id: note.id, texte: note.texte, createdAt: note.createdAt })),
    );

    setExistingFiles(
      step.uploadedFiles.map((file) => ({
        id: file.id,
        originalName: getOriginalName(file.metadata),
        size: file.size,
        status: file.status,
        scanStatus: file.scanStatus,
        sanitizeStatus: file.sanitizeStatus,
        safeFilePath: file.safeFilePath,
        canDelete: file.canDelete,
      })),
    );
    setIsOpen(true);
  };

  const closeDrawer = () => {
    resetForm();
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ openCreate, openEdit, closeDrawer }));

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => headingRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    triggerElementRef.current?.focus();
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsOpen(open);
  };

  const isFait = statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT;
  const fieldsLocked = ackNotesOnly;

  const handleAddNote = () => {
    setNotes((prev) => [...prev, { key: nextNoteKey(), texte: '' }]);
  };

  const handleRemoveNote = (key: string) => {
    setNotes((prev) => prev.filter((note) => note.key !== key));
  };

  const handleNoteChange = (key: string, value: string) => {
    setNotes((prev) => prev.map((note) => (note.key === key ? { ...note, texte: value } : note)));
  };

  const handleSelectFiles = (selected: File[]) => {
    setFilesToUpload((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const merged = selected
        .filter((f) => !existingNames.has(f.name))
        .map((f) => new File([f], f.name, { type: f.type }));
      return [...prev, ...merged];
    });
    setFileErrors({});
    setErrorMessage(null);
  };

  const validate = (): boolean => {
    let valid = true;

    if (!nom.trim()) {
      setNomError(NOM_REQUIRED_ERROR);
      valid = false;
    }

    if (!fieldsLocked && isFait && !dateRealisation) {
      setDateError(DATE_REQUIRED_ERROR);
      valid = false;
    }

    if (notes.some((note) => note.texte.length > NOTE_MAX_LENGTH)) {
      valid = false;
    }

    const newFileErrors = validateFiles(filesToUpload);
    if (Object.keys(newFileErrors).length > 0) {
      setFileErrors(newFileErrors);
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);

    let uploadedIds: string[] = [];
    if (filesToUpload.length > 0) {
      try {
        const uploaded = await Promise.all(filesToUpload.map((file) => uploadFileMutation.mutateAsync(file)));
        uploadedIds = uploaded.map((u) => u.id);
      } catch {
        setIsLoading(false);
        setErrorMessage('Une erreur est survenue lors du téléversement des fichiers. Veuillez réessayer.');
        return;
      }
    }

    const cleanedNotes = notes
      .map((note) => ({ ...note, texte: note.texte.trim() }))
      .filter((note) => note.texte.length > 0);

    try {
      if (mode === 'create') {
        await addStepMutation.mutateAsync({
          nom: nom.trim(),
          ...(statutId ? { statutId } : {}),
          ...(isFait ? { dateRealisation } : {}),
          notes: cleanedNotes.map((note) => ({ texte: note.texte })),
          fileIds: uploadedIds,
        });
        toastManager.add({
          title: 'Étape ajoutée',
          description: "L'étape a été ajoutée avec succès.",
          data: { icon: 'fr-alert--success' },
        });
      } else if (editStepId) {
        const fileIds = [...existingFiles.map((f) => f.id), ...uploadedIds];
        await updateStepMutation.mutateAsync({
          id: editStepId,
          nom: nom.trim(),
          statutId,
          ...(isFait ? { dateRealisation: dateRealisation || todayInputDate() } : {}),
          notes: cleanedNotes.map((note) => ({ ...(note.id ? { id: note.id } : {}), texte: note.texte })),
          fileIds,
        });
        toastManager.add({
          title: 'Étape modifiée',
          description: "L'étape a été modifiée avec succès.",
          data: { icon: 'fr-alert--success' },
        });
      }
      closeDrawer();
    } catch {
      setIsLoading(false);
      setErrorMessage("Une erreur est survenue lors de l'enregistrement de l'étape. Veuillez réessayer.");
    }
  };

  const handleDeleteStep = async () => {
    if (!editStepId) return;
    try {
      await deleteStepMutation.mutateAsync({ id: editStepId });
      toastManager.add({
        title: 'Étape supprimée',
        description: "L'étape a été supprimée avec succès.",
        data: { icon: 'fr-alert--success' },
      });
      deleteStepModal.close();
      closeDrawer();
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: "Une erreur est survenue lors de la suppression de l'étape.",
        data: { icon: 'fr-alert--error' },
      });
    }
  };

  return (
    <>
      <Drawer.Root variant="nonModal" withCloseButton={false} open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Panel style={{ width: 'min(90vw, 600px)', maxWidth: '100%' }} titleId={titleId}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
              {/* Extra bottom padding so the footer can scroll clear of the floating « Assistance » button. */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px 16px' }}>
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
                  <h3 id={titleId} className="fr-h6" ref={headingRef} tabIndex={-1}>
                    {mode === 'create' ? 'Ajouter une étape' : "Modifier l'étape"}
                  </h3>
                  <p className="fr-text--sm fr-mb-2w">Sauf mention contraire, tous les champs sont facultatifs.</p>

                  {fieldsLocked && (
                    <p className={`fr-text--sm ${styles.lockHint}`}>
                      Cette étape correspond à un accusé de réception automatique : seules les notes peuvent être
                      ajoutées ou modifiées.
                    </p>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    <Input
                      label="Nom de l'étape (obligatoire)"
                      disabled={isLoading || fieldsLocked}
                      state={nomError ? 'error' : 'default'}
                      stateRelatedMessage={nomError ?? undefined}
                      nativeInputProps={{
                        value: nom,
                        onChange: (e) => {
                          setNom(e.target.value);
                          if (nomError) setNomError(null);
                        },
                        placeholder: "Saisir le nom de l'étape",
                      }}
                    />

                    <div className={styles.fieldBlock}>
                      <RadioButtons
                        legend="Statut de l'étape"
                        orientation="horizontal"
                        disabled={isLoading || fieldsLocked}
                        options={[
                          {
                            label: 'Fait',
                            nativeInputProps: {
                              checked: statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT,
                              onChange: () => {
                                setStatutId(REQUETE_ETAPE_STATUT_TYPES.FAIT);
                                if (!dateRealisation) setDateRealisation(todayInputDate());
                              },
                            },
                          },
                          {
                            label: 'À faire',
                            nativeInputProps: {
                              checked: statutId === REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
                              onChange: () => {
                                setStatutId(REQUETE_ETAPE_STATUT_TYPES.A_FAIRE);
                                setDateError(null);
                              },
                            },
                          },
                        ]}
                      />
                    </div>

                    {isFait && (
                      <div className={styles.fieldBlock}>
                        <Input
                          label="Fait le (obligatoire)"
                          hintText="Date au format JJ-MM-AAAA"
                          disabled={isLoading || fieldsLocked}
                          state={dateError ? 'error' : 'default'}
                          stateRelatedMessage={dateError ?? undefined}
                          nativeInputProps={{
                            type: 'date',
                            value: dateRealisation,
                            onChange: (e) => {
                              setDateRealisation(e.target.value);
                              if (dateError) setDateError(null);
                            },
                          }}
                        />
                      </div>
                    )}

                    <section className={styles.notesSection}>
                      {readOnlyNotes.map((note) => (
                        <div key={note.id} className={styles.readOnlyNote}>
                          <p className={styles.readOnlyNoteLabel}>
                            {note.createdAt ? `Note du ${formatNoteDate(note.createdAt)}` : 'Note'} (lecture seule)
                          </p>
                          <p className={styles.readOnlyNoteText}>{note.texte}</p>
                        </div>
                      ))}

                      {notes.map((note) => {
                        const noteLabel = note.createdAt ? `Note du ${formatNoteDate(note.createdAt)}` : 'Note';
                        return (
                          <div key={note.key} className={mode === 'edit' ? styles.noteCard : undefined}>
                            {mode === 'edit' && (
                              <div className={styles.noteHeader}>
                                <p className={styles.noteHeaderLabel}>{noteLabel}</p>
                                <Button
                                  type="button"
                                  priority="tertiary"
                                  size="small"
                                  iconId="fr-icon-delete-line"
                                  title="Supprimer la note"
                                  aria-label={`Supprimer la ${noteLabel.toLowerCase()}`}
                                  disabled={isLoading}
                                  onClick={() => handleRemoveNote(note.key)}
                                />
                              </div>
                            )}
                            <Input
                              label={mode === 'edit' ? <span className="fr-sr-only">{noteLabel}</span> : noteLabel}
                              hintText="Maximum 10 000 caractères"
                              textArea
                              disabled={isLoading}
                              state={note.texte.length > NOTE_MAX_LENGTH ? 'error' : 'default'}
                              stateRelatedMessage={
                                note.texte.length > NOTE_MAX_LENGTH ? NOTE_MAX_LENGTH_ERROR : undefined
                              }
                              nativeTextAreaProps={{
                                rows: 6,
                                value: note.texte,
                                onChange: (e) => handleNoteChange(note.key, e.target.value),
                              }}
                            />
                          </div>
                        );
                      })}

                      {mode === 'edit' && (
                        <Button
                          type="button"
                          priority="tertiary"
                          size="small"
                          iconId="fr-icon-add-line"
                          disabled={isLoading}
                          onClick={handleAddNote}
                        >
                          {notes.length === 0 && readOnlyNotes.length === 0
                            ? 'Ajouter une note'
                            : 'Ajouter une autre note'}
                        </Button>
                      )}
                    </section>

                    {existingFiles.length > 0 && (
                      <section className={styles.attachmentSection}>
                        <p className={`fr-label ${styles.attachmentTitle}`}>Fichiers ajoutés</p>
                        <ul className={styles.existingFilesList}>
                          {existingFiles.map((file) => (
                            <li key={file.id} className={styles.existingFileItem}>
                              <FileDownloadLink
                                href={`/api/requete-etapes/${editStepId}/file/${file.id}`}
                                safeHref={`/api/requete-etapes/${editStepId}/file/${file.id}/safe`}
                                fileName={file.originalName}
                                fileId={file.id}
                                fileSize={file.size}
                                status={file.status}
                                scanStatus={file.scanStatus}
                                sanitizeStatus={file.sanitizeStatus}
                              />
                              {!fieldsLocked && file.canDelete && (
                                <Button
                                  type="button"
                                  priority="tertiary"
                                  size="small"
                                  iconId="fr-icon-delete-line"
                                  title="Retirer le fichier"
                                  aria-label={`Retirer le fichier ${file.originalName}`}
                                  disabled={isLoading}
                                  onClick={() => setExistingFiles((prev) => prev.filter((f) => f.id !== file.id))}
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {!fieldsLocked && (
                      <section className={styles.attachmentSection}>
                        <p className={`fr-label ${styles.attachmentTitle}`}>
                          {existingFiles.length > 0 ? "Ajouter d'autres fichiers" : 'Fichiers'}
                        </p>
                        <FileDropZone
                          selectedFiles={filesToUpload}
                          fileErrors={fileErrors}
                          isUploading={isLoading}
                          onFilesSelect={handleSelectFiles}
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
                          onRemove={(fileName) => setFilesToUpload((prev) => prev.filter((f) => f.name !== fileName))}
                        />
                      </section>
                    )}

                    {errorMessage && <p className={`fr-text--sm fr-mt-2w ${styles.errorText}`}>{errorMessage}</p>}

                    <div className={styles.footerActions}>
                      {mode === 'edit' && !fieldsLocked && (
                        <Button
                          type="button"
                          priority="secondary"
                          size="small"
                          iconId="fr-icon-delete-line"
                          disabled={isLoading}
                          style={{ marginRight: 'auto' }}
                          onClick={() => deleteStepModal.open()}
                        >
                          Supprimer l'étape
                        </Button>
                      )}
                      <Button
                        type="button"
                        priority="secondary"
                        size="small"
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" priority="primary" size="small" disabled={isLoading}>
                        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
      <deleteStepModal.Component
        title="Suppression d'une étape"
        buttons={[
          { doClosesModal: true, children: 'Annuler' },
          { doClosesModal: false, children: 'Supprimer', onClick: handleDeleteStep },
        ]}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer cette étape ? La suppression de l'étape entraîne la suppression de toutes
          les notes et fichiers liés à cette étape.
        </p>
      </deleteStepModal.Component>
    </>
  );
});
