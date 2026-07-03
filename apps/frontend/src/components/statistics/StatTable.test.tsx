import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChartItem } from './chartData';
import { StatTable } from './StatTable';

vi.mock('@codegouvfr/react-dsfr', () => ({
  fr: { cx: (...args: string[]) => args.join(' ') },
}));

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

const items: ChartItem[] = [
  { label: 'Hors compétence', value: 3 },
  { label: 'Autre', value: 1 },
];

afterEach(cleanup);

describe('StatTable', () => {
  it('renders caption, column headers, rows and a total', () => {
    render(<StatTable caption="Répartition" items={items} total={4} dimensionLabel="Raison" metricLabel="Nombre" />);

    expect(screen.getByRole('columnheader', { name: 'Raison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Part (%)' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Hors compétence' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Total' })).toBeInTheDocument();
    expect(screen.getAllByText(/75/).length).toBeGreaterThan(0);
  });

  it('keeps the numeric value and marks the in-cell bar as decorative', () => {
    const { container } = render(<StatTable caption="c" items={items} total={4} dimensionLabel="d" metricLabel="m" />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('exposes an explicit "Non disponible" when a percentage cannot be computed', () => {
    render(<StatTable caption="c" items={[{ label: 'X', value: 0 }]} total={0} dimensionLabel="d" metricLabel="m" />);

    expect(screen.getAllByText('Non disponible').length).toBeGreaterThan(0);
  });

  it('uses the SQL-precomputed percent and hides the total footer', () => {
    render(
      <StatTable
        caption="c"
        items={[{ label: 'Violences physiques', value: 3, percent: 1.7 }]}
        total={3}
        dimensionLabel="Motif"
        metricLabel="Nombre de requêtes"
        percentLabel="Part (%)"
        hasPrecomputedPercent
      />,
    );

    expect(screen.getByText('1,7 %')).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Total' })).not.toBeInTheDocument();
  });

  it('sorts rows by value in descending order (largest first)', () => {
    render(
      <StatTable
        caption="c"
        items={[
          { label: 'Petit', value: 1 },
          { label: 'Grand', value: 9 },
          { label: 'Moyen', value: 4 },
        ]}
        total={14}
        dimensionLabel="Motif"
        metricLabel="Nombre"
      />,
    );

    const rowHeaders = screen.getAllByRole('rowheader').map((cell) => cell.textContent);
    // Total exclu (pied de tableau) : on ne garde que les lignes de données.
    expect(rowHeaders.filter((label) => label !== 'Total')).toEqual(['Grand', 'Moyen', 'Petit']);
  });

  it('paginates client-side when there are more than 10 rows', () => {
    const many: ChartItem[] = Array.from({ length: 12 }, (_, index) => ({
      label: `Motif ${index + 1}`,
      value: index + 1,
    }));

    render(<StatTable caption="c" items={many} total={78} dimensionLabel="Motif" metricLabel="Nombre" />);

    // Tri décroissant : page 1 = les 10 plus grandes valeurs (Motif 12 → Motif 3).
    expect(screen.getByRole('rowheader', { name: 'Motif 12' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Motif 3' })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Motif 2' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('page 2'));

    // Page 2 : les 2 plus petites valeurs (Motif 2 et Motif 1), Motif 12 masqué.
    expect(screen.getByRole('rowheader', { name: 'Motif 2' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Motif 1' })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Motif 12' })).not.toBeInTheDocument();
  });

  it('does not render pagination for 10 rows or fewer', () => {
    const ten: ChartItem[] = Array.from({ length: 10 }, (_, index) => ({
      label: `Motif ${index + 1}`,
      value: index + 1,
    }));

    render(<StatTable caption="c" items={ten} total={55} dimensionLabel="Motif" metricLabel="Nombre" />);

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('renders "Non disponible" when a precomputed percent is missing', () => {
    render(
      <StatTable
        caption="c"
        items={[{ label: 'Violences physiques', value: 3, percent: null }]}
        total={3}
        dimensionLabel="Motif"
        metricLabel="Nombre de requêtes"
        percentLabel="Part (%)"
        hasPrecomputedPercent
      />,
    );

    expect(screen.getByText('Non disponible')).toBeInTheDocument();
  });

  it('resets to the first page when the items prop changes', () => {
    const buildItems = (prefix: string): ChartItem[] =>
      Array.from({ length: 12 }, (_, index) => ({ label: `${prefix} ${index + 1}`, value: index + 1 }));

    const { rerender } = render(
      <StatTable caption="c" items={buildItems('Motif')} total={78} dimensionLabel="Motif" metricLabel="Nombre" />,
    );

    fireEvent.click(screen.getByText('page 2'));
    expect(screen.getByRole('rowheader', { name: 'Motif 1' })).toBeInTheDocument();

    rerender(
      <StatTable caption="c" items={buildItems('Autre')} total={78} dimensionLabel="Motif" metricLabel="Nombre" />,
    );

    // Retour en page 1 sur le nouveau jeu : les plus grandes valeurs, pas la queue de la page 2.
    expect(screen.getByRole('rowheader', { name: 'Autre 12' })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Autre 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Motif 1' })).not.toBeInTheDocument();
  });
});
