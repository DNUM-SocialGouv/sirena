import { Button } from '@codegouvfr/react-dsfr/Button';
import clsx from 'clsx';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type StepNoteProps = {
  id: string;
  content: string;
  createdAt: string;
  requeteStateId: string;
  author: {
    prenom: string;
    nom: string;
  };
  files: {
    id: string;
    size: number;
    originalName: string;
  }[];
  onEdit?: (noteData: {
    id: string;
    requeteStateId: string;
    content: string;
    files: { id: string; size: number; originalName: string }[];
  }) => void;
};

export const StepNote = ({ id, author, content, createdAt, requeteStateId, files, onEdit }: StepNoteProps) => {
  const handleEdit = () => {
    onEdit?.({
      id,
      requeteStateId,
      content,
      files,
    });
  };

  return (
    <div className={styles['request-note']}>
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
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
            {author.prenom} {author.nom}
          </span>
        </div>
        <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
          <Button
            priority="tertiary no outline"
            size="small"
            iconId="fr-icon-edit-line"
            title="Modifier la note"
            aria-label="Modifier la note"
            className="fr-btn--icon-center center-icon-with-sr-only"
            onClick={handleEdit}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span className="fr-sr-only">Modifier la note</span>
          </Button>
        </div>
      </div>
      <p className={styles['request-note__content']}>{content}</p>
      {files.length > 0 && (
        <ul>
          {files.map((file) => (
            <li key={file.id} className={styles['request-note__file']}>
              <FileDownloadLink
                href={`/api/requete-etapes/${requeteStateId}/file/${file.id}`}
                fileName={file.originalName}
                fileSize={file.size}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
