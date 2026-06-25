import clsx from 'clsx';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { capitalizeFirst } from '@/components/requestId/sections/helpers';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type StepNoteProps = {
  id: string;
  content: string;
  createdAt: string;
  requeteStateId: string;
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
};

export const StepNote = ({ author, content, createdAt, requeteStateId, files, clotureReasonLabels }: StepNoteProps) => {
  return (
    <div className={styles['request-note']}>
      <div className="fr-grid-row fr-grid-row--middle fr-mb-1v">
        <p className={clsx('fr-col fr-mb-0', styles['request-note__from'])}>
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
                {capitalizeFirst(author.prenom)} <span className="lastname">{author.nom}</span>
              </span>
            </>
          )}
        </p>
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
          <p className="fr-text--sm fr-text--grey">{content}</p>
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
