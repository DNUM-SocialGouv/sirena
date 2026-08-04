import { Tooltip } from '@codegouvfr/react-dsfr/Tooltip';
import styles from './cardHelp.module.css';

export function CardHelp({ description }: { description?: string | null }) {
  if (!description) return null;
  return (
    <span className={styles.help}>
      <Tooltip kind="click" title={description} />
    </span>
  );
}
