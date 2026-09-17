import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { REQUETE_MESSAGE_MAX_LENGTH } from '@sirena/common/constants';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { SelectedFilesList } from '@/components/common/SelectedFilesList';
import { usePostRequeteMessage } from '@/hooks/mutations/postRequeteMessage.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import { ACCEPTED_FILE_TYPES, FILE_UPLOAD_HINT } from '@/utils/fileHelpers';
import { validateFile } from '@/utils/fileValidation';
import styles from './discussion.module.css';

const MAX_LENGTH_LABEL = REQUETE_MESSAGE_MAX_LENGTH.toLocaleString('fr-FR');
const LENGTH_ERROR = `Le message ne doit pas dépasser ${MAX_LENGTH_LABEL} caractères.`;
const UPLOAD_ERROR = 'Une erreur technique est survenue lors du téléversement des pièces jointes. Veuillez réessayer.';
// The counter only speaks up near the limit, so it informs without narrating every keystroke.
const COUNTER_VISIBLE_FROM = REQUETE_MESSAGE_MAX_LENGTH - 200;

type MessageComposerProps = {
  requestId: string;
  onSent?: () => void;
};

type RejectedFile = { fileName: string; reason: string };

export const MessageComposer = ({ requestId, onSent }: MessageComposerProps) => {
  const [contenu, setContenu] = useState('');
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const justSentRef = useRef(false);
  const uploadedIdsRef = useRef(new Map<File, string>());

  const textAreaId = useId();
  const hintId = useId();
  const counterId = useId();
  const errorId = useId();
  const fileHintId = useId();

  const uploadFileMutation = useUploadFile({ silentToastError: true });
  const postMessageMutation = usePostRequeteMessage(requestId);

  const trimmedContenu = contenu.trim();
  const isTooLong = trimmedContenu.length > REQUETE_MESSAGE_MAX_LENGTH;
  const isEmpty = trimmedContenu.length === 0 && filesToUpload.length === 0;

  const handleContenuChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setContenu(event.target.value);
  }, []);

  const handleOpenFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  const handleFilesSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (picked.length === 0) return;

    const rejected: RejectedFile[] = [];
    const accepted: File[] = [];
    for (const file of picked) {
      const errors = validateFile(file);
      if (errors.length > 0) {
        rejected.push({ fileName: file.name, reason: errors.map((error) => error.message).join(' ') });
        continue;
      }
      accepted.push(file);
    }

    setRejectedFiles(rejected);
    setFilesToUpload((previous) => {
      const knownNames = new Set(previous.map((file) => file.name));
      return [...previous, ...accepted.filter((file) => !knownNames.has(file.name))];
    });
  }, []);

  const handleRemoveFile = useCallback((fileName: string) => {
    setFilesToUpload((previous) => {
      for (const file of previous) {
        if (file.name === fileName) uploadedIdsRef.current.delete(file);
      }
      return previous.filter((file) => file.name !== fileName);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isEmpty || isTooLong || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const notYetUploaded = filesToUpload.filter((file) => !uploadedIdsRef.current.has(file));
    if (notYetUploaded.length > 0) {
      try {
        const uploaded = await Promise.all(notYetUploaded.map((file) => uploadFileMutation.mutateAsync(file)));
        uploaded.forEach((result, index) => {
          const file = notYetUploaded[index];
          if (file) uploadedIdsRef.current.set(file, result.id);
        });
      } catch {
        setIsSubmitting(false);
        setSubmitError(UPLOAD_ERROR);
        return;
      }
    }

    const fileIds = filesToUpload
      .map((file) => uploadedIdsRef.current.get(file))
      .filter((id): id is string => id !== undefined);

    try {
      await postMessageMutation.mutateAsync({ contenu: trimmedContenu, fileIds });
      setContenu('');
      setFilesToUpload([]);
      setRejectedFiles([]);
      uploadedIdsRef.current.clear();
      justSentRef.current = true;
      onSent?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Le message n'a pas pu être envoyé.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    filesToUpload,
    isEmpty,
    isSubmitting,
    isTooLong,
    onSent,
    postMessageMutation,
    trimmedContenu,
    uploadFileMutation,
  ]);

  useEffect(() => {
    if (!isSubmitting && justSentRef.current) {
      justSentRef.current = false;
      textAreaRef.current?.focus();
    }
  }, [isSubmitting]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSubmit();
    },
    [handleSubmit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  const describedBy = [hintId, counterId, isTooLong ? errorId : null].filter(Boolean).join(' ');

  return (
    <form className={styles.composer} onSubmit={handleFormSubmit}>
      <div className={`fr-input-group ${isTooLong ? 'fr-input-group--error' : ''}`.trim()}>
        <label className="fr-label" htmlFor={textAreaId}>
          Nouveau message
          <span className="fr-hint-text" id={hintId}>
            Maximum {MAX_LENGTH_LABEL} caractères<span className="fr-sr-only">. Ctrl + Entrée pour envoyer.</span>
          </span>
        </label>
        <textarea
          ref={textAreaRef}
          id={textAreaId}
          className={`fr-input ${isTooLong ? 'fr-input--error' : ''}`.trim()}
          rows={4}
          value={contenu}
          onChange={handleContenuChange}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-describedby={describedBy}
          aria-invalid={isTooLong || undefined}
        />
        <p id={counterId} className="fr-hint-text fr-mt-1v fr-mb-0" aria-live="polite" aria-atomic="true">
          {contenu.length >= COUNTER_VISIBLE_FROM ? `${contenu.length} / ${REQUETE_MESSAGE_MAX_LENGTH} caractères` : ''}
        </p>
        {isTooLong ? (
          <p id={errorId} className="fr-error-text">
            {LENGTH_ERROR}
          </p>
        ) : null}
      </div>

      <div className={styles.attachRow}>
        <Button
          type="button"
          priority="secondary"
          iconId="fr-icon-attachment-line"
          title="Ajouter un fichier"
          onClick={handleOpenFilePicker}
          disabled={isSubmitting}
          nativeButtonProps={{ 'aria-describedby': fileHintId }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          className={styles.fileInput}
          onChange={handleFilesSelect}
          tabIndex={-1}
          aria-hidden="true"
        />
        <p id={fileHintId} className="fr-hint-text">
          {FILE_UPLOAD_HINT}
        </p>
      </div>

      <SelectedFilesList files={filesToUpload} title="Pièces jointes" variant="compact" onRemove={handleRemoveFile} />

      {rejectedFiles.length > 0 ? (
        <Alert
          severity="error"
          small
          className="fr-mt-2w"
          title="Pièce jointe refusée"
          description={
            <ul className="fr-mb-0">
              {rejectedFiles.map(({ fileName, reason }) => (
                <li key={fileName}>
                  {fileName} : {reason}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}

      {submitError ? <Alert severity="error" small description={submitError} className="fr-mt-2w" /> : null}

      <div className={styles.composerActions}>
        <Button type="submit" disabled={isEmpty || isTooLong || isSubmitting}>
          {isSubmitting ? 'Envoi…' : 'Envoyer'}
        </Button>
      </div>
    </form>
  );
};
