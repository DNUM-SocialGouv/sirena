import { Button } from '@codegouvfr/react-dsfr/Button';
import clsx from 'clsx';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type StepNoteProps = {
  id: string;
  content: string;
  createdAt: string;
  requeteStateId: string;
  author: {
    firstName: string;
    lastName: string;
  };
  files: {
    id: string;
    size: number;
    originalName: string;
  }[];
};

export const StepNote = ({ author, content, createdAt, requeteStateId, files }: StepNoteProps) => {
  return (
    <div className={styles['request-note']}>
      <div className='fr-grid-row fr-grid-row--middle fr-mb-2w"'>
        <div className={clsx('fr-col', styles['request-note__from'])}>
          Le
          <span>
            {' '}
            {new Date(createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}{' '}
          </span>
          par{' '}
          <span className="fr-text--bold">
            {author.firstName} {author.lastName}
          </span>
        </div>
        <div className="fr-col-auto">
          <Button
            priority="tertiary no outline"
            size="small"
            iconId="fr-icon-edit-line"
            title="Éditer"
            className="fr-btn--icon-center center-icon-with-sr-only"
          >
            <span className="fr-sr-only">Éditer</span>
          </Button>
        </div>
      </div>
      <p className={styles['request-note__content']}>{content}</p>
      {files.length > 0 && (
        <ul>
          {files.map((file) => (
            <li key={file.id} className={styles['request-note__file']}>
              <a
                href={`/api/requete-states/${requeteStateId}/file/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {String(file.originalName)} ({(file.size / 1024).toFixed(2)} Ko)
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
