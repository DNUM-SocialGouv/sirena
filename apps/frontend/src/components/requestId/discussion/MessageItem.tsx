import { useId } from 'react';
import { EntiteTypeBadge } from '@/components/common/EntiteTypeBadge';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { formatAgent, formatDate } from '@/components/requestId/processing/stepFormat';
import type { RequeteMessage } from '@/hooks/queries/requeteMessages.hook';
import styles from './discussion.module.css';

type MessageItemProps = {
  message: RequeteMessage;
  requestId: string;
  isOwnEntite: boolean;
};

export const MessageItem = ({ message, requestId, isOwnEntite }: MessageItemProps) => {
  const headingId = useId();
  const createdAt = new Date(message.createdAt);
  const relation = isOwnEntite ? 'owner' : 'foreign';

  return (
    <li>
      <article aria-labelledby={headingId}>
        <p className={styles.messageMeta}>
          <EntiteTypeBadge
            as="span"
            entiteTypeId={message.entite.entiteTypeId}
            label={message.entite.entiteTypeId}
            relation={relation}
            aria-hidden="true"
          />
          <span id={headingId}>
            {message.author ? formatAgent(message.author) : 'Auteur inconnu'} ({message.entite.nomComplet}
            {isOwnEntite ? <span className="fr-sr-only">, votre entité</span> : null}) le{' '}
            <time dateTime={createdAt.toISOString()}>{formatDate(createdAt)}</time>
          </span>
        </p>

        <div className={`${styles.bubble} ${isOwnEntite ? styles.bubbleOwner : styles.bubbleForeign}`}>
          {message.contenu ? <p className={styles.messageBody}>{message.contenu}</p> : null}

          {message.uploadedFiles.length > 0 ? (
            <ul className={styles.messageFiles} role="list">
              {message.uploadedFiles.map((file) => (
                <li key={file.id} className={styles.messageFile}>
                  <FileDownloadLink
                    href={`/api/requete-messages/${requestId}/file/${file.id}`}
                    safeHref={`/api/requete-messages/${requestId}/file/${file.id}/safe`}
                    fileName={file.fileName}
                    fileId={file.id}
                    fileSize={file.size}
                    status={file.status}
                    scanStatus={file.scanStatus}
                    sanitizeStatus={file.sanitizeStatus}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>
    </li>
  );
};
