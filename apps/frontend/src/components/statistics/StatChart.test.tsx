import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedCard } from './chartData';
import { StatChart } from './StatChart';

vi.mock('@codegouvfr/react-dsfr', () => ({
  fr: { cx: (...args: string[]) => args.join(' ') },
}));

// Stub léger du SegmentedControl DSFR : on n'a besoin que des radios pour piloter la vue.
vi.mock('@codegouvfr/react-dsfr/SegmentedControl', () => ({
  SegmentedControl: ({
    segments,
  }: {
    segments: Array<{ label: string; nativeInputProps?: { checked?: boolean; onChange?: () => void } }>;
  }) => (
    <fieldset>
      {segments.map((segment) => (
        <label key={segment.label}>
          <input
            type="radio"
            checked={Boolean(segment.nativeInputProps?.checked)}
            onChange={segment.nativeInputProps?.onChange}
          />
          {segment.label}
        </label>
      ))}
    </fieldset>
  ),
}));

const parsed: ParsedCard = {
  items: [
    { label: 'A', value: 3 },
    { label: 'B', value: 1 },
  ],
  total: 4,
  dimensionLabel: 'Raison',
  metricLabel: 'Nombre',
  percentLabel: 'Part (%)',
  hasPrecomputedPercent: false,
};

afterEach(cleanup);

describe('StatChart', () => {
  it('renders a heading, the data table by default and a graph/table switch', () => {
    render(<StatChart name="Répartition" parsed={parsed} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Répartition' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Graphique' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tableau' })).toBeInTheDocument();
    // Table view by default: data table shown, no chart image yet
    expect(screen.getByRole('columnheader', { name: 'Raison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('switches to the chart image when the graph segment is selected', () => {
    render(<StatChart name="Répartition" parsed={parsed} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Graphique' }));

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('aria-label', expect.stringContaining('répartition'));
    expect(image).toHaveAttribute('aria-describedby');
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.queryByRole('columnheader', { name: 'Nombre' })).not.toBeInTheDocument();
  });

  it('renders an empty state when there is no data', () => {
    render(
      <StatChart
        name="Vide"
        parsed={{
          items: [],
          total: 0,
          dimensionLabel: 'd',
          metricLabel: 'm',
          percentLabel: 'Part (%)',
          hasPrecomputedPercent: false,
        }}
      />,
    );

    expect(screen.getByText('Aucune donnée à afficher.')).toBeInTheDocument();
  });
});
