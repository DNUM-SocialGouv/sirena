import { Tooltip } from '@codegouvfr/react-dsfr/Tooltip';
import styles from './helpTooltip.module.css';

export function HelpTooltip({ description }: { description?: string | null }) {
  if (!description) return null;
  return (
    <span className={styles.help}>
      <Tooltip kind="click" title={description} />
    </span>
  );
}
