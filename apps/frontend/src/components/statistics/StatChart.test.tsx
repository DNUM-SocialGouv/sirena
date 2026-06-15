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
            onChange={() => segment.nativeInputProps?.onChange?.()}
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
};

afterEach(cleanup);

describe('StatChart', () => {
  it('renders a heading, the chart image and a graph/table switch', () => {
    render(<StatChart name="Répartition" parsed={parsed} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Répartition' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('légende'));
    expect(screen.getByRole('radio', { name: 'Graphique' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tableau' })).toBeInTheDocument();
    // Chart view by default: legend shown, no data table yet
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.queryByRole('columnheader', { name: 'Nombre' })).not.toBeInTheDocument();
  });

  it('switches to the data table when the table segment is selected', () => {
    render(<StatChart name="Répartition" parsed={parsed} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Tableau' }));

    expect(screen.getByRole('columnheader', { name: 'Raison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders an empty state when there is no data', () => {
    render(<StatChart name="Vide" parsed={{ items: [], total: 0, dimensionLabel: 'd', metricLabel: 'm' }} />);

    expect(screen.getByText('Aucune donnée à afficher.')).toBeInTheDocument();
  });
});
