import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useCallback } from 'react';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { formatAgent, formatDate } from './stepFormat';

type StepFile = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number]['uploadedFiles'][number];

type StepFilesProps = {
  files: StepFile[];
  stepId: string;
  /**
   * How to label a file without an uploader.
   * - `automatic` (default): the system added it, e.g. an automatic Accusé de réception.
   * - `anonymous`: an agent added it but the account no longer exists, e.g. a closure file.
   */
  unknownUploader?: 'automatic' | 'anonymous';
  /** When provided, each file card shows a delete button that calls it. The caller confirms and deletes. */
  onRequestDelete?: (fileId: string, fileName: string) => void;
};

type StepFileDeleteButtonProps = {
  fileId: string;
  fileName: string;
  onRequestDelete: (fileId: string, fileName: string) => void;
};

const StepFileDeleteButton = ({ fileId, fileName, onRequestDelete }: StepFileDeleteButtonProps) => {
  const handleClick = useCallback(() => {
    onRequestDelete(fileId, fileName);
  }, [onRequestDelete, fileId, fileName]);

  return (
    <Button
      aria-label={`Supprimer le fichier ${fileName}`}
      title="Supprimer le fichier"
      type="button"
      className={fr.cx('fr-btn', 'fr-btn--sm', 'fr-btn--tertiary', 'fr-icon-delete-line')}
      onClick={handleClick}
    >
      <span className={fr.cx('fr-sr-only')}>Supprimer le fichier</span>
    </Button>
  );
};

export const StepFiles = ({ files, stepId, unknownUploader = 'automatic', onRequestDelete }: StepFilesProps) => {
  if (files.length === 0) return null;

  return (
    <div className={styles['step-files']}>
      {files.map((file) => {
        const fileName = file.fileName;
        const author = file.uploadedBy;
        return (
          <div key={file.id} className={styles['step-file']}>
            <p className={styles['step-file__from']}>
              <span className="fr-icon-attachment-line fr-icon--xs" aria-hidden="true" /> Fichier ajouté{' '}
              {author ? (
                <>
                  le {formatDate(file.createdAt)} par {formatAgent(author)}
                </>
              ) : unknownUploader === 'automatic' ? (
                <>automatiquement le {formatDate(file.createdAt)}</>
              ) : (
                <>le {formatDate(file.createdAt)}</>
              )}
            </p>
            <div className={styles['request-note__file']}>
              <FileDownloadLink
                href={`/api/requete-etapes/${stepId}/file/${file.id}`}
                safeHref={`/api/requete-etapes/${stepId}/file/${file.id}/safe`}
                fileName={fileName}
                fileId={file.id}
                fileSize={file.size}
                status={file.status}
                scanStatus={file.scanStatus}
                sanitizeStatus={file.sanitizeStatus}
              />
              {onRequestDelete ? (
                <StepFileDeleteButton fileId={file.id} fileName={fileName} onRequestDelete={onRequestDelete} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
