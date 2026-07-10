import { clsx } from 'clsx';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { formatAgent, formatDate } from './stepFormat';

type StepNoteProps = {
  content: string;
  createdAt: string;
  author?: {
    prenom: string;
    nom: string;
  } | null;
};

export const StepNote = ({ author, content, createdAt }: StepNoteProps) => {
  return (
    <div className={styles['request-note']}>
      <div className="fr-grid-row fr-grid-row--middle fr-mb-1v">
        <p className={clsx('fr-col fr-mb-0', styles['request-note__from'])}>
          <span className="fr-icon-draft-line fr-icon--xs" aria-hidden="true" /> Note rédigée le {formatDate(createdAt)}
          {author && <> par {formatAgent(author)}</>}
        </p>
      </div>
      {content && (
        <div>
          <p className="fr-text--sm fr-text--grey fr-mb-0">{content}</p>
        </div>
      )}
    </div>
  );
};
