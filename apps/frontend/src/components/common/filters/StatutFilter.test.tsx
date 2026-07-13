import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatutFilter } from './StatutFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StatutFilter', () => {
  it('lets the user pick a statut via the dropdown checkbox filter', async () => {
    const onChange = vi.fn();

    render(<StatutFilter selectedIds={[]} counts={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nouveau' }));

    expect(onChange).toHaveBeenCalledWith(['NOUVEAU']);
  });

  it('appends the request count to each statut label when counts are provided', async () => {
    render(
      <StatutFilter
        selectedIds={[]}
        counts={{ NOUVEAU: 3, EN_COURS: 5, CLOTUREE: 0, TRAITEE: 2 }}
        onChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));

    expect(screen.getByRole('checkbox', { name: 'Nouveau (3)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'En cours (5)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Clôturée (0)' })).toBeInTheDocument();
  });

  it('hides the "Pris en compte" statut when no request has it', async () => {
    render(
      <StatutFilter
        selectedIds={[]}
        counts={{ NOUVEAU: 3, EN_COURS: 5, CLOTUREE: 1, TRAITEE: 0 }}
        onChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));

    expect(screen.queryByRole('checkbox', { name: /Pris en compte/ })).not.toBeInTheDocument();
  });

  it('shows the "Pris en compte" statut when at least one request has it', async () => {
    render(
      <StatutFilter
        selectedIds={[]}
        counts={{ NOUVEAU: 3, EN_COURS: 5, CLOTUREE: 1, TRAITEE: 2 }}
        onChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));

    expect(screen.getByRole('checkbox', { name: 'Pris en compte (2)' })).toBeInTheDocument();
  });

  it('shows the "Pris en compte" statut when it is already selected even without counts', async () => {
    render(<StatutFilter selectedIds={['TRAITEE']} counts={null} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Statut/ }));

    expect(screen.getByRole('checkbox', { name: 'Pris en compte' })).toBeInTheDocument();
  });
});
