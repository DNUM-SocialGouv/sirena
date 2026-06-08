import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedCard } from './chartData';
import { StatChart } from './StatChart';

vi.mock('@codegouvfr/react-dsfr', () => ({
  fr: { cx: (...args: string[]) => args.join(' ') },
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
  it('renders a real heading, an img-role chart pointing to the legend, and a data-table disclosure', () => {
    render(<StatChart name="Répartition" parsed={parsed} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Répartition' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('légende'));
    expect(screen.getByText('Afficher les données du graphique')).toBeInTheDocument();
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  it('renders an empty state when there is no data', () => {
    render(<StatChart name="Vide" parsed={{ items: [], total: 0, dimensionLabel: 'd', metricLabel: 'm' }} />);

    expect(screen.getByText('Aucune donnée à afficher.')).toBeInTheDocument();
  });
});
