import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatTable } from './StatTable';

vi.mock('@codegouvfr/react-dsfr', () => ({
  fr: { cx: (...args: string[]) => args.join(' ') },
}));

const items = [
  { label: 'Hors compétence', value: 3 },
  { label: 'Autre', value: 1 },
];

afterEach(cleanup);

describe('StatTable', () => {
  it('renders caption, column headers, rows and a total', () => {
    render(<StatTable caption="Répartition" items={items} total={4} dimensionLabel="Raison" metricLabel="Nombre" />);

    expect(screen.getByRole('columnheader', { name: 'Raison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Part (en pourcentage)' })).toBeInTheDocument();
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
});
