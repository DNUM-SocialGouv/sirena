import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { formatAgent, formatDate } from './stepFormat';

type StepFile = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number]['uploadedFiles'][number];

type StepFilesProps = {
  files: StepFile[];
  stepId: string;
};

export const StepFiles = ({ files, stepId }: StepFilesProps) => {
  if (files.length === 0) return null;

  return (
    <div className={styles['step-files']}>
      {files.map((file) => {
        const fileName = (file.metadata as { originalName?: string })?.originalName || 'Unknown';
        const author = file.uploadedBy;
        return (
          <div key={file.id} className={styles['step-file']}>
            <p className={styles['step-file__from']}>
              <span className="fr-icon-attachment-line fr-icon--xs" aria-hidden="true" /> Fichier ajouté{' '}
              {author ? (
                <>
                  le {formatDate(file.createdAt)} par <span className="fr-text--bold">{formatAgent(author)}</span>
                </>
              ) : (
                <>automatiquement le {formatDate(file.createdAt)}</>
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
            </div>
          </div>
        );
      })}
    </div>
  );
};
