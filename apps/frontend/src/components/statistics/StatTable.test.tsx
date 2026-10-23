import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatTable } from './StatTable';
import type { ParsedTable } from './tableData';

vi.mock('@codegouvfr/react-dsfr/Pagination', () => ({
  Pagination: ({
    count,
    getPageLinkProps,
  }: {
    count: number;
    getPageLinkProps: (page: number) => { href: string; onClick: (e: MouseEvent) => void };
  }) => (
    <nav aria-label="Pagination">
      {Array.from({ length: count }, (_, index) => {
        const { href, onClick } = getPageLinkProps(index + 1);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static page list in a test-only mock
          <a key={`page-${index + 1}`} href={href} onClick={onClick}>
            {`page ${index + 1}`}
          </a>
        );
      })}
    </nav>
  ),
}));

const sumMetric = (rows: unknown[][]): number =>
  rows.reduce((sum, row) => sum + (typeof row[1] === 'number' ? row[1] : 0), 0);

const buildTable = (rows: unknown[][], overrides: Partial<ParsedTable> = {}): ParsedTable => ({
  columns: [
    { label: 'Motif', kind: 'text' },
    { label: 'Nombre', kind: 'number' },
  ],
  rows,
  derivedShare: { label: 'Part (%)', columnIndex: 1, total: sumMetric(rows) },
  ...overrides,
});

const rows: unknown[][] = [
  ['Hors compétence', 3],
  ['Autre', 1],
];

const rowLabels = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

const headerLabels = () => screen.getAllByRole('columnheader').map((header) => header.textContent);

afterEach(cleanup);

describe('StatTable', () => {
  it('renders caption, column headers and rows', () => {
    render(
      <StatTable
        caption="Répartition"
        table={buildTable(rows, {
          columns: [
            { label: 'Raison', kind: 'text' },
            { label: 'Nombre', kind: 'number' },
          ],
        })}
      />,
    );

    expect(screen.getByText('Répartition')).toBeInTheDocument();
    expect(headerLabels()).toEqual(['Raison', 'Nombre', 'Part (%)']);
    expect(screen.getByRole('cell', { name: 'Hors compétence' })).toBeInTheDocument();
    expect(screen.getAllByText(/75/).length).toBeGreaterThan(0);
  });

  it('never renders a total row', () => {
    render(<StatTable caption="Répartition" table={buildTable(rows)} />);

    expect(screen.queryByRole('cell', { name: 'Total' })).not.toBeInTheDocument();
    expect(rowLabels()).toEqual(['Hors compétence', 'Autre']);
  });

  it('renders the raw metric value', () => {
    render(<StatTable caption="c" table={buildTable(rows)} />);

    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
  });

  it('exposes an explicit "Non disponible" when a percentage cannot be computed', () => {
    render(<StatTable caption="c" table={buildTable([['X', 0]])} />);

    expect(screen.getAllByText('Non disponible').length).toBeGreaterThan(0);
  });

  it('uses the SQL-precomputed percent', () => {
    render(
      <StatTable
        caption="c"
        table={buildTable([['Violences physiques', 3, 1.7]], {
          columns: [
            { label: 'Motif', kind: 'text' },
            { label: 'Nombre', kind: 'number' },
            { label: 'Part des requêtes (%)', kind: 'percent' },
          ],
          derivedShare: null,
        })}
      />,
    );

    expect(headerLabels()).toEqual(['Motif', 'Nombre', 'Part des requêtes (%)']);
    expect(screen.getByText('1,7 %')).toBeInTheDocument();
    expect(rowLabels()).toEqual(['Violences physiques']);
  });

  it('renders every metric column and no derived share when the card exposes several metrics', () => {
    render(
      <StatTable
        caption="c"
        table={buildTable([['DDETS du Rhône', 12, 5, 7]], {
          columns: [
            { label: 'Entité', kind: 'text' },
            { label: 'Nombre de comptes actifs', kind: 'number' },
            { label: "dont au niveau de l'entité", kind: 'number' },
            { label: 'dont dans les directions et services', kind: 'number' },
          ],
          derivedShare: null,
        })}
      />,
    );

    expect(headerLabels()).toEqual([
      'Entité',
      'Nombre de comptes actifs',
      "dont au niveau de l'entité",
      'dont dans les directions et services',
    ]);
    expect(screen.queryByRole('columnheader', { name: 'Part (%)' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '12' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '7' })).toBeInTheDocument();
  });

  it('formats numbers in French and leaves text columns untouched', () => {
    render(
      <StatTable
        caption="c"
        table={buildTable([['abc-123', 'DDETS du Rhône', 12345]], {
          columns: [
            { label: 'id', kind: 'text' },
            { label: 'nomComplet', kind: 'text' },
            { label: 'Nombre', kind: 'number' },
          ],
          derivedShare: null,
        })}
      />,
    );

    expect(screen.getByRole('cell', { name: 'abc-123' })).toBeInTheDocument();
    expect(screen.getByText('12 345')).toBeInTheDocument();
  });

  it('labels a missing leading cell and marks the other empty cells as unavailable', () => {
    render(
      <StatTable
        caption="c"
        table={buildTable([[null, null, null]], {
          columns: [
            { label: 'Entité', kind: 'text' },
            { label: 'Nombre', kind: 'number' },
            { label: 'Part (%)', kind: 'percent' },
          ],
          derivedShare: null,
        })}
      />,
    );

    expect(screen.getByRole('cell', { name: 'Non précisé' })).toBeInTheDocument();
    expect(screen.getAllByText('Non disponible')).toHaveLength(2);
  });

  it('keeps the rows in their original order', () => {
    render(
      <StatTable
        caption="c"
        table={buildTable([
          ['Petit', 1],
          ['Grand', 9],
          ['Moyen', 4],
        ])}
      />,
    );

    expect(rowLabels()).toEqual(['Petit', 'Grand', 'Moyen']);
  });

  it('paginates client-side when there are more than 10 rows', () => {
    const many: unknown[][] = Array.from({ length: 12 }, (_, index) => [`Motif ${index + 1}`, index + 1]);

    render(<StatTable caption="c" table={buildTable(many)} />);

    // Original order preserved: page 1 holds the first ten rows (Motif 1 → Motif 10).
    expect(screen.getByRole('cell', { name: 'Motif 1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Motif 10' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Motif 11' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('page 2'));

    // Page 2 holds the last two rows (Motif 11 and Motif 12), Motif 1 is hidden.
    expect(screen.getByRole('cell', { name: 'Motif 11' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Motif 12' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Motif 1' })).not.toBeInTheDocument();
  });

  it('computes the share on every row, not only the visible page', () => {
    const many: unknown[][] = Array.from({ length: 12 }, (_, index) => [`Motif ${index + 1}`, index === 0 ? 78 : 2]);

    render(<StatTable caption="c" table={buildTable(many)} />);

    // 78 / 100: the total covers the 12 rows, not only the 10 on screen.
    expect(screen.getByText('78 %')).toBeInTheDocument();
  });

  it('does not render pagination for 10 rows or fewer', () => {
    const ten: unknown[][] = Array.from({ length: 10 }, (_, index) => [`Motif ${index + 1}`, index + 1]);

    render(<StatTable caption="c" table={buildTable(ten)} />);

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('renders "Non disponible" when a precomputed percent is missing', () => {
    render(
      <StatTable
        caption="c"
        table={buildTable([['Violences physiques', 3, null]], {
          columns: [
            { label: 'Motif', kind: 'text' },
            { label: 'Nombre', kind: 'number' },
            { label: 'Part (%)', kind: 'percent' },
          ],
          derivedShare: null,
        })}
      />,
    );

    expect(screen.getByText('Non disponible')).toBeInTheDocument();
  });

  it('resets to the first page when the rows prop changes', () => {
    const buildRows = (prefix: string): unknown[][] =>
      Array.from({ length: 12 }, (_, index) => [`${prefix} ${index + 1}`, index + 1]);

    const { rerender } = render(<StatTable caption="c" table={buildTable(buildRows('Motif'))} />);

    fireEvent.click(screen.getByText('page 2'));
    expect(screen.getByRole('cell', { name: 'Motif 11' })).toBeInTheDocument();

    rerender(<StatTable caption="c" table={buildTable(buildRows('Autre'))} />);

    // Retour en page 1 sur le nouveau jeu, dans l'ordre d'origine (Autre 1 → Autre 10).
    expect(screen.getByRole('cell', { name: 'Autre 1' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Autre 12' })).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Motif 11' })).not.toBeInTheDocument();
  });
});
