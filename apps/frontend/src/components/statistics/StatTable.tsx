import { fr } from '@codegouvfr/react-dsfr';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Table } from '@codegouvfr/react-dsfr/Table';
import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { type ChartItem, numberFormatter, type ParsedCard, percentFormatter, percentPointFormatter } from './chartData';

const PAGE_SIZE = 10;

interface StatTableProps {
  caption: string;
  parsed: ParsedCard;
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

export function StatTable({ caption, parsed, hideCaption }: StatTableProps) {
  const { items, total, dimensionLabel, metricLabel, percentLabel, hasPrecomputedPercent } = parsed;
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

  const data = visibleItems.map((item) => [
    item.label,
    numberFormatter.format(item.value),
    formatPercent(item, total, hasPrecomputedPercent),
  ]);

  return (
    <>
      <Table
        caption={caption}
        noCaption={hideCaption}
        headers={[dimensionLabel, metricLabel, percentLabel]}
        data={data}
      />
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
    </>
  );
}
