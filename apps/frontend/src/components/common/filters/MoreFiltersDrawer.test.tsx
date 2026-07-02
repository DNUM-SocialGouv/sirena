import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoreFiltersDrawer } from './MoreFiltersDrawer';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MoreFiltersDrawer', () => {
  it('applies the selected statuts when "Filtrer les requêtes" is clicked', async () => {
    const onApply = vi.fn();

    render(<MoreFiltersDrawer selectedStatutIds={[]} onApply={onApply} />);

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nouveau' }));
    await userEvent.click(screen.getByRole('button', { name: 'Filtrer les requêtes' }));

    expect(onApply).toHaveBeenCalledWith(['NOUVEAU']);
  });

  it('does not apply changes when "Annuler" is clicked', async () => {
    const onApply = vi.fn();

    render(<MoreFiltersDrawer selectedStatutIds={[]} onApply={onApply} />);

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nouveau' }));
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onApply).not.toHaveBeenCalled();
  });

  it('initializes the checkboxes from the currently applied statuts', async () => {
    const onApply = vi.fn();

    render(<MoreFiltersDrawer selectedStatutIds={['EN_COURS']} onApply={onApply} />);

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));

    expect(screen.getByRole('checkbox', { name: 'En cours' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Nouveau' })).not.toBeChecked();
  });

  it('does not apply changes when the "Fermer" button is used', async () => {
    const onApply = vi.fn();

    render(<MoreFiltersDrawer selectedStatutIds={[]} onApply={onApply} />);

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nouveau' }));
    await userEvent.click(screen.getByRole('button', { name: /^Fermer/ }));

    expect(onApply).not.toHaveBeenCalled();
  });

  it('discards the unapplied draft when reopened after "Annuler"', async () => {
    const onApply = vi.fn();

    render(<MoreFiltersDrawer selectedStatutIds={[]} onApply={onApply} />);

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nouveau' }));
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));

    expect(screen.getByRole('checkbox', { name: 'Nouveau' })).not.toBeChecked();
  });
});
