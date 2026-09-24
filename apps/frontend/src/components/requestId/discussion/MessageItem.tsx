import { EntiteTypeBadge } from '@/components/common/EntiteTypeBadge';
import { formatAgent, formatDate } from '@/components/requestId/processing/stepFormat';
import type { RequeteMessage } from '@/hooks/queries/requeteMessages.hook';
import styles from './discussion.module.css';

type MessageItemProps = {
  message: RequeteMessage;
  isOwnEntite: boolean;
};

export const MessageItem = ({ message, isOwnEntite }: MessageItemProps) => {
  const createdAt = new Date(message.createdAt);
  const relation = isOwnEntite ? 'owner' : 'foreign';

  return (
    <li>
      <p className={styles.messageMeta}>
        <EntiteTypeBadge
          as="span"
          entiteTypeId={message.entite.entiteTypeId}
          label={message.entite.entiteTypeId}
          relation={relation}
          aria-hidden="true"
        />
        <span>
          {message.author ? formatAgent(message.author) : 'Auteur inconnu'} ({message.entite.nomComplet}
          {isOwnEntite ? <span className="fr-sr-only">, votre entité</span> : null}) le{' '}
          <time dateTime={createdAt.toISOString()}>{formatDate(createdAt)}</time>
        </span>
      </p>

      <div className={`${styles.bubble} ${isOwnEntite ? styles.bubbleOwner : styles.bubbleForeign}`}>
        <p className={styles.messageBody}>{message.contenu}</p>
      </div>
    </li>
  );
};
