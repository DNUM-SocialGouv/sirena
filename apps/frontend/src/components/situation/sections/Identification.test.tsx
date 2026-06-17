import type { SituationData } from '@sirena/common/schemas';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Identification } from './Identification';

function ControlledIdentification({
  initialData = {},
  onValidationChange,
}: {
  initialData?: SituationData;
  onValidationChange?: (isValid: boolean) => void;
}) {
  const [formData, setFormData] = useState<SituationData>(initialData);
  return (
    <Identification
      formData={formData}
      setFormData={setFormData}
      isSaving={false}
      onValidationChange={onValidationChange}
    />
  );
}

const erreurMessage = /doit contenir uniquement des lettres et des chiffres/i;

const numeroLabel = /Numéro de signalement associé/i;

afterEach(() => {
  cleanup();
});

describe('Identification', () => {
  it('rend le bloc dans un fieldset avec une legend "Identification"', () => {
    render(<ControlledIdentification />);
    const fieldset = screen.getByRole('group', { name: /Identification/i });
    expect(fieldset).toBeInTheDocument();
  });

  it("n'affiche pas le champ numéro tant que Oui n'est pas coché", () => {
    render(<ControlledIdentification />);
    expect(screen.queryByLabelText(numeroLabel)).not.toBeInTheDocument();
  });

  it('affiche le champ numéro avec son aide à la saisie quand Oui est coché', () => {
    render(<ControlledIdentification />);
    fireEvent.click(screen.getByLabelText('Oui'));
    expect(screen.getByLabelText(numeroLabel)).toBeInTheDocument();
    expect(screen.getByText(/séparer les valeurs par des virgules\. Exemples : 098655, 446789/i)).toBeInTheDocument();
  });

  it('masque et vide les numéros quand on repasse à Non', () => {
    render(<ControlledIdentification initialData={{ estLieAuSignalement: true, numerosSignalement: '098655' }} />);
    expect(screen.getByLabelText(numeroLabel)).toHaveValue('098655');
    fireEvent.click(screen.getByLabelText('Non'));
    expect(screen.queryByLabelText(numeroLabel)).not.toBeInTheDocument();
    // Re-cocher Oui : le champ est de nouveau vide
    fireEvent.click(screen.getByLabelText('Oui'));
    expect(screen.getByLabelText(numeroLabel)).toHaveValue('');
  });

  it('does not show an error for an alphanumeric value separated by commas', () => {
    const onValidationChange = vi.fn();
    render(
      <ControlledIdentification
        initialData={{ estLieAuSignalement: true, numerosSignalement: 'ABC123, 446789' }}
        onValidationChange={onValidationChange}
      />,
    );
    expect(screen.queryByText(erreurMessage)).not.toBeInTheDocument();
    expect(onValidationChange).toHaveBeenLastCalledWith(true);
  });

  it('shows an error message and reports invalidity for a value with forbidden characters', () => {
    const onValidationChange = vi.fn();
    render(
      <ControlledIdentification
        initialData={{ estLieAuSignalement: true, numerosSignalement: '098-655' }}
        onValidationChange={onValidationChange}
      />,
    );
    expect(screen.getByText(erreurMessage)).toBeInTheDocument();
    expect(onValidationChange).toHaveBeenLastCalledWith(false);
  });

  it('returns to a valid state once the value becomes correct', () => {
    const onValidationChange = vi.fn();
    render(
      <ControlledIdentification
        initialData={{ estLieAuSignalement: true, numerosSignalement: '098/655' }}
        onValidationChange={onValidationChange}
      />,
    );
    expect(screen.getByText(erreurMessage)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(numeroLabel), { target: { value: '098655, 446789' } });
    expect(screen.queryByText(erreurMessage)).not.toBeInTheDocument();
    expect(onValidationChange).toHaveBeenLastCalledWith(true);
  });
});
