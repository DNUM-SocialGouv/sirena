import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { REQUETE_MESSAGE_MAX_LENGTH } from '@sirena/common/constants';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePostRequeteMessage } from '@/hooks/mutations/postRequeteMessage.hook';
import styles from './discussion.module.css';

const MAX_LENGTH_LABEL = REQUETE_MESSAGE_MAX_LENGTH.toLocaleString('fr-FR');
const LENGTH_ERROR = `Le message ne doit pas dépasser ${MAX_LENGTH_LABEL} caractères. Supprimer les caractères excédentaires.`;
const EMPTY_ERROR = 'Veuillez saisir un message pour l’envoyer.';
const SUBMIT_ERROR = "Erreur : le message n'a pas pu être envoyé.";

type MessageComposerProps = {
  requestId: string;
  onSent?: () => void;
};

export const MessageComposer = ({ requestId, onSent }: MessageComposerProps) => {
  const [contenu, setContenu] = useState('');
  const [emptyError, setEmptyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const justSentRef = useRef(false);

  const textAreaId = useId();
  const hintId = useId();
  const errorId = useId();

  const postMessageMutation = usePostRequeteMessage(requestId);

  const trimmedContenu = contenu.trim();
  const isTooLong = trimmedContenu.length > REQUETE_MESSAGE_MAX_LENGTH;
  const isEmpty = trimmedContenu.length === 0;
  const fieldError = isTooLong ? LENGTH_ERROR : emptyError;

  const handleContenuChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setContenu(event.target.value);
    setEmptyError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (isEmpty || isTooLong) {
      setEmptyError(isEmpty ? EMPTY_ERROR : null);
      textAreaRef.current?.focus();
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await postMessageMutation.mutateAsync({ contenu: trimmedContenu });
      setContenu('');
      justSentRef.current = true;
      onSent?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? `Erreur : ${error.message}` : SUBMIT_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }, [isEmpty, isSubmitting, isTooLong, onSent, postMessageMutation, trimmedContenu]);

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

  const describedBy = [hintId, fieldError ? errorId : null].filter(Boolean).join(' ');

  return (
    <form className={styles.composer} onSubmit={handleFormSubmit}>
      <div className={`fr-input-group ${fieldError ? 'fr-input-group--error' : ''}`.trim()}>
        <label className="fr-label" htmlFor={textAreaId}>
          Nouveau message
          <span className="fr-hint-text" id={hintId}>
            Maximum {MAX_LENGTH_LABEL} caractères
          </span>
        </label>
        <textarea
          ref={textAreaRef}
          id={textAreaId}
          className={`fr-input ${fieldError ? 'fr-input--error' : ''}`.trim()}
          rows={4}
          value={contenu}
          onChange={handleContenuChange}
          aria-describedby={describedBy}
          aria-invalid={fieldError ? true : undefined}
        />
        {fieldError ? (
          <p id={errorId} className="fr-error-text" role="alert">
            {fieldError}
          </p>
        ) : null}
      </div>

      {submitError ? <Alert severity="error" small description={submitError} className="fr-mt-2w" /> : null}

      <div className={styles.composerActions}>
        <Button type="submit">{isSubmitting ? 'Envoi…' : 'Envoyer'}</Button>
      </div>
    </form>
  );
};
