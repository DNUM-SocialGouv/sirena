import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PeriodFilter } from './PeriodFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PeriodFilter', () => {
  it('keeps the options inside a dropdown that is closed by default', () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Période' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Date de début')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: 'Mois courant' })).not.toBeInTheDocument();
  });

  it('exposes predefined periods and a custom range once opened', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    expect(screen.getByRole('menuitemradio', { name: 'Semaine courante' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Mois courant' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Année courante' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Mois glissant' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de début/)).toBeInTheDocument();
  });

  it('moves focus into the panel when opened', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'Semaine courante' })).toHaveFocus());
  });

  it('applies a predefined period on click and closes the panel', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Mois courant' }));

    expect(onChange).toHaveBeenCalledWith({ period: 'current-month', startDate: undefined, endDate: undefined });
    expect(screen.queryByRole('menuitemradio', { name: 'Mois courant' })).not.toBeInTheDocument();
  });

  it('applies a custom range and clears any preset', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/Date de fin/), { target: { value: '2026-01-31' } });
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/ }));

    expect(onChange).toHaveBeenCalledWith({ period: undefined, startDate: '2026-01-01', endDate: '2026-01-31' });
  });

  it('does not apply an invalid range and moves focus to the end date field', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    const endInput = screen.getByLabelText(/Date de fin/);
    fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: '2026-02-01' } });
    fireEvent.change(endInput, { target: { value: '2026-01-01' } });

    const applyButton = screen.getByRole('button', { name: /Appliquer/ });
    // Le bouton reste actif (pas de disabled), le contrôle se fait à la soumission.
    expect(applyButton).toBeEnabled();
    const form = applyButton.closest('form');
    if (!form) throw new Error('form introuvable');
    fireEvent.submit(form);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('La date de fin doit être postérieure à la date de début.')).toBeInTheDocument();
    expect(endInput).toHaveFocus();
  });

  it('exposes presets as a radio menu and marks the active one as checked', async () => {
    render(<PeriodFilter value={{ period: 'rolling-month' }} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    expect(screen.getByRole('menu', { name: 'Période prédéfinie' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Mois glissant' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Mois courant' })).toHaveAttribute('aria-checked', 'false');
  });

  it('navigates predefined periods with the arrow keys', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'Semaine courante' })).toHaveFocus());

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Mois courant' })).toHaveFocus();

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('menuitemradio', { name: 'Mois glissant' })).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Semaine courante' })).toHaveFocus();
  });

  it('shows the active selection as a tag that clears the period when dismissed', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{ period: 'rolling-month' }} onChange={onChange} />);

    // Le nom accessible contient le libellé visible (WCAG 2.5.3 Label in Name).
    const tag = screen.getByRole('button', { name: /^Période : Mois glissant/ });
    expect(tag).toBeInTheDocument();

    await userEvent.click(tag);
    expect(onChange).toHaveBeenCalledWith({ period: undefined, startDate: undefined, endDate: undefined });
  });
});
