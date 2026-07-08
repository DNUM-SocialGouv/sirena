import { fr } from '@codegouvfr/react-dsfr';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useOverflowX } from '@/hooks/useOverflowX';
import { type ChartItem, numberFormatter, percentFormatter, percentPointFormatter } from './chartData';
import styles from './statTable.module.css';

const PAGE_SIZE = 10;

interface StatTableProps {
  caption: string;
  items: ChartItem[];
  total: number;
  dimensionLabel: string;
  metricLabel: string;
  percentLabel?: string;
  hasPrecomputedPercent?: boolean;
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

function formatPercent(item: ChartItem, total: number, hasPrecomputedPercent: boolean): ReactNode {
  if (hasPrecomputedPercent) {
    return item.percent == null ? <EmptyCell /> : `${percentPointFormatter.format(item.percent)} %`;
  }
  return total > 0 ? percentFormatter.format(item.value / total) : <EmptyCell />;
}

export function StatTable({
  caption,
  items,
  total,
  dimensionLabel,
  metricLabel,
  percentLabel = 'Part (%)',
  hasPrecomputedPercent = false,
  hideCaption,
}: StatTableProps) {
  const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);
  const { ref, isOverflowing } = useOverflowX<HTMLDivElement>();

  const [page, setPage] = useState(1);

  const [previousItems, setPreviousItems] = useState(items);
  if (items !== previousItems) {
    setPreviousItems(items);
    setPage(1);
  }

  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const showPagination = items.length > PAGE_SIZE;
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visibleItems = showPagination ? items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : items;

  const getPageLinkProps = useCallback(
    (pageNumber: number) => ({
      href: '#',
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setPage(pageNumber);
      },
    }),
    [],
  );

  const paginationLabel = `Pagination du tableau ${caption}`;
  const paginationRef = useCallback(
    (node: HTMLDivElement | null) => {
      node?.setAttribute('aria-label', paginationLabel);
    },
    [paginationLabel],
  );

  return (
    <div className={styles.container}>
      <div ref={ref} className={styles.scroll} {...(isOverflowing ? { tabIndex: 0 } : {})}>
        <table className={styles.table}>
          <caption className={hideCaption ? fr.cx('fr-sr-only') : styles.caption}>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{dimensionLabel}</th>
              <th scope="col" className={styles.numCol}>
                {metricLabel}
              </th>
              <th scope="col" className={styles.numCol}>
                {percentLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={`${item.label}-${item.value}`}>
                <th scope="row">{item.label}</th>
                <td className={styles.barCell}>
                  <span
                    className={styles.bar}
                    style={{ inlineSize: max > 0 ? `${(item.value / max) * 100}%` : 0 }}
                    aria-hidden="true"
                  />
                  <span className={styles.barValue}>{numberFormatter.format(item.value)}</span>
                </td>
                <td className={styles.numCol}>{formatPercent(item, total, hasPrecomputedPercent)}</td>
              </tr>
            ))}
          </tbody>
          {!hasPrecomputedPercent && (
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className={styles.numCol}>{numberFormatter.format(total)}</td>
                <td className={styles.numCol}>{total > 0 ? percentFormatter.format(1) : <EmptyCell />}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {showPagination && (
        <div className={fr.cx('fr-mt-2w', 'fr-grid-row', 'fr-grid-row--center')}>
          <Pagination
            ref={paginationRef}
            count={pageCount}
            defaultPage={currentPage}
            getPageLinkProps={getPageLinkProps}
          />
        </div>
      )}
    </div>
  );
}
