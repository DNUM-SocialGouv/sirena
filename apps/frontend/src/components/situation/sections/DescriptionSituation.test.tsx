import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DescriptionFaits, type DescriptionFaitsRef } from './DescriptionSituation';

const setInputValidity = (input: HTMLInputElement, valid: boolean) => {
  Object.defineProperty(input, 'validity', {
    configurable: true,
    value: { valid },
  });
};

describe('DescriptionFaits', () => {
  it('focuses the first invalid date and associates its error message', () => {
    const ref = createRef<DescriptionFaitsRef>();
    render(<DescriptionFaits ref={ref} formData={{}} setFormData={vi.fn()} />);

    const dateDebutInput = screen.getByLabelText('Date de début des faits') as HTMLInputElement;
    const dateFinInput = screen.getByLabelText('Date de fin des faits') as HTMLInputElement;
    setInputValidity(dateDebutInput, false);
    setInputValidity(dateFinInput, false);

    let isValid = true;
    act(() => {
      isValid = ref.current?.validateAndFocusFirstError() ?? true;
    });

    expect(isValid).toBe(false);
    expect(dateDebutInput).toHaveFocus();
    expect(dateDebutInput).toHaveClass('fr-input--error');
    expect(dateFinInput).toHaveClass('fr-input--error');

    const errorId = dateDebutInput.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)).toHaveTextContent(
      'Le champ “Date de début des faits” n’est pas valide. Format attendu : JJ/MM/AAAA',
    );
  });

  it('focuses the end date when it is the only invalid date', () => {
    const ref = createRef<DescriptionFaitsRef>();
    render(<DescriptionFaits ref={ref} formData={{}} setFormData={vi.fn()} />);

    const dateDebutInput = screen.getByLabelText('Date de début des faits') as HTMLInputElement;
    const dateFinInput = screen.getByLabelText('Date de fin des faits') as HTMLInputElement;
    setInputValidity(dateDebutInput, true);
    setInputValidity(dateFinInput, false);

    act(() => {
      ref.current?.validateAndFocusFirstError();
    });

    expect(dateFinInput).toHaveFocus();
    expect(dateDebutInput).not.toHaveClass('fr-input--error');
    expect(dateFinInput).toHaveClass('fr-input--error');

    const errorId = dateFinInput.getAttribute('aria-describedby');
    expect(document.getElementById(errorId as string)).toHaveTextContent(
      'Le champ “Date de fin des faits” n’est pas valide. Format attendu : JJ/MM/AAAA',
    );
  });
});
