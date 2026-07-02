import type { SituationData } from '@sirena/common/schemas';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Identification } from './Identification';

function ControlledIdentification({ initialData = {} }: { initialData?: SituationData }) {
  const [formData, setFormData] = useState<SituationData>(initialData);
  return <Identification formData={formData} setFormData={setFormData} isSaving={false} />;
}

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

  it('accepte librement les numéros dans un format quelconque, sans restriction de caractères', () => {
    render(
      <ControlledIdentification
        initialData={{ estLieAuSignalement: true, numerosSignalement: 'SIG-2024/098-655, ABC.123' }}
      />,
    );
    expect(screen.getByLabelText(numeroLabel)).toHaveValue('SIG-2024/098-655, ABC.123');
  });
});
