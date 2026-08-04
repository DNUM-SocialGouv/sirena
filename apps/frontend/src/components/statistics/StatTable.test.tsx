import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChartItem, ParsedCard } from './chartData';
import { StatTable } from './StatTable';

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

const buildParsed = (items: ChartItem[], overrides: Partial<ParsedCard> = {}): ParsedCard => ({
  items,
  total: items.reduce((sum, item) => sum + item.value, 0),
  dimensionLabel: 'Motif',
  metricLabel: 'Nombre',
  percentLabel: 'Part (%)',
  hasPrecomputedPercent: false,
  ...overrides,
});

const items: ChartItem[] = [
  { label: 'Hors compétence', value: 3 },
  { label: 'Autre', value: 1 },
];

const rowLabels = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

afterEach(cleanup);

describe('StatTable', () => {
  it('renders caption, column headers and rows', () => {
    render(<StatTable caption="Répartition" parsed={buildParsed(items, { dimensionLabel: 'Raison' })} />);

    expect(screen.getByText('Répartition')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Raison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Part (%)' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Hors compétence' })).toBeInTheDocument();
    expect(screen.getAllByText(/75/).length).toBeGreaterThan(0);
  });

  it('never renders a total row', () => {
    render(<StatTable caption="Répartition" parsed={buildParsed(items)} />);

    expect(screen.queryByRole('cell', { name: 'Total' })).not.toBeInTheDocument();
    expect(rowLabels()).toEqual(['Hors compétence', 'Autre']);
  });

  it('renders the raw metric value', () => {
    render(<StatTable caption="c" parsed={buildParsed(items)} />);

    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
  });

  it('exposes an explicit "Non disponible" when a percentage cannot be computed', () => {
    render(<StatTable caption="c" parsed={buildParsed([{ label: 'X', value: 0 }])} />);

    expect(screen.getAllByText('Non disponible').length).toBeGreaterThan(0);
  });

  it('uses the SQL-precomputed percent', () => {
    render(
      <StatTable
        caption="c"
        parsed={buildParsed([{ label: 'Violences physiques', value: 3, percent: 1.7 }], {
          hasPrecomputedPercent: true,
        })}
      />,
    );

    expect(screen.getByText('1,7 %')).toBeInTheDocument();
    expect(rowLabels()).toEqual(['Violences physiques']);
  });

  it('keeps the rows in their original order', () => {
    render(
      <StatTable
        caption="c"
        parsed={buildParsed([
          { label: 'Petit', value: 1 },
          { label: 'Grand', value: 9 },
          { label: 'Moyen', value: 4 },
        ])}
      />,
    );

    expect(rowLabels()).toEqual(['Petit', 'Grand', 'Moyen']);
  });

  it('paginates client-side when there are more than 10 rows', () => {
    const many: ChartItem[] = Array.from({ length: 12 }, (_, index) => ({
      label: `Motif ${index + 1}`,
      value: index + 1,
    }));

    render(<StatTable caption="c" parsed={buildParsed(many)} />);

    // Ordre d'origine préservé : page 1 = les 10 premières lignes (Motif 1 → Motif 10).
    expect(screen.getByRole('cell', { name: 'Motif 1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Motif 10' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Motif 11' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('page 2'));

    // Page 2 : les 2 dernières lignes (Motif 11 et Motif 12), Motif 1 masqué.
    expect(screen.getByRole('cell', { name: 'Motif 11' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Motif 12' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Motif 1' })).not.toBeInTheDocument();
  });

  it('does not render pagination for 10 rows or fewer', () => {
    const ten: ChartItem[] = Array.from({ length: 10 }, (_, index) => ({
      label: `Motif ${index + 1}`,
      value: index + 1,
    }));

    render(<StatTable caption="c" parsed={buildParsed(ten)} />);

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('renders "Non disponible" when a precomputed percent is missing', () => {
    render(
      <StatTable
        caption="c"
        parsed={buildParsed([{ label: 'Violences physiques', value: 3, percent: null }], {
          hasPrecomputedPercent: true,
        })}
      />,
    );

    expect(screen.getByText('Non disponible')).toBeInTheDocument();
  });

  it('resets to the first page when the items prop changes', () => {
    const buildItems = (prefix: string): ChartItem[] =>
      Array.from({ length: 12 }, (_, index) => ({ label: `${prefix} ${index + 1}`, value: index + 1 }));

    const { rerender } = render(<StatTable caption="c" parsed={buildParsed(buildItems('Motif'))} />);

    fireEvent.click(screen.getByText('page 2'));
    expect(screen.getByRole('cell', { name: 'Motif 11' })).toBeInTheDocument();

    rerender(<StatTable caption="c" parsed={buildParsed(buildItems('Autre'))} />);

    // Retour en page 1 sur le nouveau jeu, dans l'ordre d'origine (Autre 1 → Autre 10).
    expect(screen.getByRole('cell', { name: 'Autre 1' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Autre 12' })).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Motif 11' })).not.toBeInTheDocument();
  });
});
