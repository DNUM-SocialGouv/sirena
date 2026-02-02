import { Button } from '@codegouvfr/react-dsfr/Button';
import clsx from 'clsx';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { capitalizeFirst } from '@/components/requestId/sections/helpers';
import { useCanEdit } from '@/hooks/useCanEdit';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type StepNoteProps = {
  id: string;
  content: string;
  createdAt: string;
  requeteStateId: string;
  requestId: string;
  clotureReasonLabels: string[] | null;
  author?: {
    prenom: string;
    nom: string;
  } | null;
  files: {
    id: string;
    size: number;
    originalName: string;
    status?: string;
    scanStatus?: string;
    sanitizeStatus?: string;
    safeFilePath?: string | null;
  }[];
  onEdit?: (noteData: {
    id: string;
    requeteStateId: string;
    content: string;
    files: {
      id: string;
      size: number;
      originalName: string;
      status?: string;
      scanStatus?: string;
      sanitizeStatus?: string;
      safeFilePath?: string | null;
    }[];
  }) => void;
};

export const StepNote = ({
  id,
  author,
  content,
  createdAt,
  requeteStateId,
  requestId,
  files,
  onEdit,
  clotureReasonLabels,
}: StepNoteProps) => {
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const isSystemNote = author === null;

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
          {author && (
            <>
              <span>par </span>
              <span className="fr-text--bold">
                {capitalizeFirst(author.prenom)} {capitalizeFirst(author.nom)}
              </span>
            </>
          )}
        </div>
        <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
          {canEdit && !isSystemNote && (
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
          )}
        </div>
      </div>
      {clotureReasonLabels && (
        <div>
          <div className="fr-text--xs fr-mb-0">Raisons de la clôture</div>
          <ul className="fr-text--sm fr-text--grey fr-mt-1v fr-mb-0">
            {clotureReasonLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}
      {content && (
        <div className="fr-mb-2w">
          {clotureReasonLabels && <div className="fr-text--xs fr-mb-0">Précisions</div>}
          <div className="fr-text--sm fr-text--grey">{content}</div>
        </div>
      )}
      {files.length > 0 && (
        <div>
          <div className="fr-text--xs fr-mb-0">Pièces jointes</div>
          <ul>
            {files.map((file) => (
              <li key={file.id} className={styles['request-note__file']}>
                <FileDownloadLink
                  href={`/api/requete-etapes/${requeteStateId}/file/${file.id}`}
                  safeHref={`/api/requete-etapes/${requeteStateId}/file/${file.id}/safe`}
                  fileName={file.originalName}
                  fileId={file.id}
                  fileSize={file.size}
                  status={file.status}
                  scanStatus={file.scanStatus}
                  sanitizeStatus={file.sanitizeStatus}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
