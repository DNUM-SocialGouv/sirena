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
import { usePostRequeteMessage } from '@/hooks/mutations/postRequeteMessage.hook';
import styles from './discussion.module.css';

const MAX_LENGTH_LABEL = REQUETE_MESSAGE_MAX_LENGTH.toLocaleString('fr-FR');
const LENGTH_ERROR = `Le message ne doit pas dépasser ${MAX_LENGTH_LABEL} caractères.`;
// The counter only speaks up near the limit, so it informs without narrating every keystroke.
const COUNTER_VISIBLE_FROM = REQUETE_MESSAGE_MAX_LENGTH - 200;

type MessageComposerProps = {
  requestId: string;
  onSent?: () => void;
};

export const MessageComposer = ({ requestId, onSent }: MessageComposerProps) => {
  const [contenu, setContenu] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const justSentRef = useRef(false);

  const textAreaId = useId();
  const hintId = useId();
  const counterId = useId();
  const errorId = useId();

  const postMessageMutation = usePostRequeteMessage(requestId);

  const trimmedContenu = contenu.trim();
  const isTooLong = trimmedContenu.length > REQUETE_MESSAGE_MAX_LENGTH;
  const isEmpty = trimmedContenu.length === 0;

  const handleContenuChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setContenu(event.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isEmpty || isTooLong || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await postMessageMutation.mutateAsync({ contenu: trimmedContenu });
      setContenu('');
      justSentRef.current = true;
      onSent?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Le message n'a pas pu être envoyé.");
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

      {submitError ? <Alert severity="error" small description={submitError} className="fr-mt-2w" /> : null}

      <div className={styles.composerActions}>
        <Button type="submit" disabled={isEmpty || isTooLong || isSubmitting}>
          {isSubmitting ? 'Envoi…' : 'Envoyer'}
        </Button>
      </div>
    </form>
  );
};
