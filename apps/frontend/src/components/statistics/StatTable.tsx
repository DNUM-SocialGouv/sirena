import { fr } from '@codegouvfr/react-dsfr';
import { useOverflowX } from '@/hooks/useOverflowX';
import { type ChartItem, numberFormatter, percentFormatter } from './chartData';
import styles from './statTable.module.css';

interface StatTableProps {
  caption: string;
  items: ChartItem[];
  total: number;
  dimensionLabel: string;
  metricLabel: string;
  hideCaption?: boolean;
}

function EmptyCell() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className={fr.cx('fr-sr-only')}>Non disponible</span>
    </>
  );
}

export function StatTable({ caption, items, total, dimensionLabel, metricLabel, hideCaption }: StatTableProps) {
  const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);
  const { ref, isOverflowing } = useOverflowX<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={styles.scroll}
      {...(isOverflowing ? { tabIndex: 0, role: 'region', 'aria-label': caption } : {})}
    >
      <table className={styles.table}>
        <caption className={hideCaption ? fr.cx('fr-sr-only') : styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{dimensionLabel}</th>
            <th scope="col" className={styles.numCol}>
              {metricLabel}
            </th>
            <th scope="col" className={styles.numCol}>
              Part
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td className={styles.barCell}>
                <span
                  className={styles.bar}
                  style={{ inlineSize: max > 0 ? `${(item.value / max) * 100}%` : 0 }}
                  aria-hidden="true"
                />
                <span className={styles.barValue}>{numberFormatter.format(item.value)}</span>
              </td>
              <td className={styles.numCol}>
                {total > 0 ? percentFormatter.format(item.value / total) : <EmptyCell />}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td className={styles.numCol}>{numberFormatter.format(total)}</td>
            <td className={styles.numCol}>{total > 0 ? percentFormatter.format(1) : <EmptyCell />}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
