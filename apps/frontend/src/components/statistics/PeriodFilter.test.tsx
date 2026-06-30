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
    expect(screen.queryByRole('radio', { name: 'Mois courant' })).not.toBeInTheDocument();
  });

  it('exposes predefined periods and a custom range once opened', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    expect(screen.getByRole('radio', { name: 'Semaine courante' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mois courant' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Année courante' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mois glissant' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de début/)).toBeInTheDocument();
  });

  it('moves focus into the panel when opened', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    await waitFor(() => expect(screen.getByRole('radio', { name: 'Semaine courante' })).toHaveFocus());
  });

  it('treats a predefined period as a draft and only applies it on submit', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Mois courant' }));

    expect(screen.getByRole('radio', { name: 'Mois courant' })).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Appliquer/ }));

    expect(onChange).toHaveBeenCalledWith({ period: 'current-month', startDate: undefined, endDate: undefined });
    expect(screen.queryByRole('radio', { name: 'Mois courant' })).not.toBeInTheDocument();
  });

  it('keeps a preset and a custom range mutually exclusive in the draft', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Mois courant' }));
    expect(screen.getByRole('radio', { name: 'Mois courant' })).toBeChecked();

    fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: '2026-01-01' } });
    expect(screen.getByRole('radio', { name: 'Mois courant' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Semaine courante' }));
    expect(screen.getByLabelText(/Date de début/)).toHaveValue('');
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

  it('does not apply or clear anything when submitting with no selection', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/ }));

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText('Sélectionnez une période prédéfinie ou renseignez une période personnalisée.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Semaine courante' })).toHaveFocus();
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

  it('exposes presets as a radio group and marks the active one as checked', async () => {
    render(<PeriodFilter value={{ period: 'rolling-month' }} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    expect(screen.getByRole('group', { name: 'Période prédéfinie' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mois glissant' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Mois courant' })).not.toBeChecked();
  });

  it('shows the active selection as a tag that clears the period when dismissed', async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={{ period: 'rolling-month' }} onChange={onChange} />);

    const tag = screen.getByRole('button', { name: /^Requêtes créées : Mois glissant/ });
    expect(tag).toBeInTheDocument();

    await userEvent.click(tag);
    expect(onChange).toHaveBeenCalledWith({ period: undefined, startDate: undefined, endDate: undefined });
  });

  it('phrases a custom range tag around the request creation date', () => {
    render(<PeriodFilter value={{ startDate: '2026-01-01', endDate: '2026-01-31' }} onChange={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /^Requêtes créées entre le 01\/01\/2026 et le 31\/01\/2026/ }),
    ).toBeInTheDocument();
  });

  it('explains in the panel that the filter uses the request creation date', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));

    expect(screen.getByText('Le filtre porte sur la date de création de la requête dans SIRENA.')).toBeInTheDocument();
  });

  it('stays open on a transient focusout while focus remains inside the panel', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    const firstRadio = screen.getByRole('radio', { name: 'Semaine courante' });
    firstRadio.focus();

    fireEvent.focusOut(firstRadio, { relatedTarget: null });

    await waitFor(() => expect(screen.getByRole('radio', { name: 'Semaine courante' })).toBeInTheDocument());
  });

  it('closes when focus actually leaves the panel (WCAG keyboard tab-out)', async () => {
    render(
      <>
        <PeriodFilter value={{}} onChange={vi.fn()} />
        <button type="button">Ailleurs</button>
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Période' }));
    expect(screen.getByRole('radio', { name: 'Semaine courante' })).toBeInTheDocument();

    const outside = screen.getByRole('button', { name: 'Ailleurs' });
    outside.focus();
    fireEvent.focusOut(screen.getByRole('radio', { name: 'Semaine courante' }), { relatedTarget: outside });

    await waitFor(() => expect(screen.queryByRole('radio', { name: 'Semaine courante' })).not.toBeInTheDocument());
  });

  it('does not close via focusout when focus moves to the trigger', async () => {
    render(<PeriodFilter value={{}} onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Période' });
    await userEvent.click(trigger);
    const firstRadio = screen.getByRole('radio', { name: 'Semaine courante' });

    trigger.focus();
    fireEvent.focusOut(firstRadio, { relatedTarget: trigger });

    await waitFor(() => expect(screen.getByRole('radio', { name: 'Semaine courante' })).toBeInTheDocument());
  });
});
