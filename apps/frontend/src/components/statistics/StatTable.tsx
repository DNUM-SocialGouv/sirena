import { fr } from '@codegouvfr/react-dsfr';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Table } from '@codegouvfr/react-dsfr/Table';
import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { formatShare, numberFormatter, percentPointFormatter } from './chartData';
import { toNumber } from './columns';
import styles from './statTable.module.css';
import type { DerivedShare, ParsedTable, TableColumnKind } from './tableData';

const PAGE_SIZE = 10;

interface StatTableProps {
  caption: string;
  table: ParsedTable;
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

function formatCell(value: unknown, kind: TableColumnKind, isLeadingColumn: boolean): ReactNode {
  if (value == null) return isLeadingColumn ? 'Non précisé' : <EmptyCell />;
  if (kind === 'text') return String(value);

  const numericValue = toNumber(value);
  if (numericValue == null) return String(value);
  return kind === 'percent' ? `${percentPointFormatter.format(numericValue)} %` : numberFormatter.format(numericValue);
}

function formatDerivedShare(row: readonly unknown[], { columnIndex, total }: DerivedShare): ReactNode {
  if (total <= 0) return <EmptyCell />;
  return formatShare((toNumber(row[columnIndex]) ?? 0) / total);
}

export function StatTable({ caption, table, hideCaption }: StatTableProps) {
  const { columns, rows, derivedShare } = table;
  const [page, setPage] = useState(1);

  const [previousRows, setPreviousRows] = useState(rows);
  if (rows !== previousRows) {
    setPreviousRows(rows);
    setPage(1);
  }

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const showPagination = rows.length > PAGE_SIZE;
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visibleRows = showPagination ? rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : rows;

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

  const headers = derivedShare
    ? [...columns.map((column) => column.label), derivedShare.label]
    : columns.map((column) => column.label);

  const data = visibleRows.map((row) => {
    const cells = columns.map((column, index) => formatCell(row[index], column.kind, index === 0));
    return derivedShare ? [...cells, formatDerivedShare(row, derivedShare)] : cells;
  });

  return (
    <>
      <Table
        caption={caption}
        noCaption={hideCaption}
        headers={headers}
        data={data}
        className={`${fr.cx('fr-mb-0')} ${styles.table}`}
      />
      {showPagination && (
        <div className={`${fr.cx('fr-grid-row', 'fr-grid-row--center')} ${styles.pagination}`}>
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
