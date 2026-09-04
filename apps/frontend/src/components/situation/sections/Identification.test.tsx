import type { SituationData } from '@sirena/common/schemas';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Identification } from './Identification';

function ControlledIdentification({
  initialData = {},
  isFromSirec,
  sirecDepartement,
}: {
  initialData?: SituationData;
  isFromSirec?: boolean;
  sirecDepartement?: string | null;
}) {
  const [formData, setFormData] = useState<SituationData>(initialData);
  return (
    <Identification
      formData={formData}
      setFormData={setFormData}
      isSaving={false}
      isFromSirec={isFromSirec}
      sirecDepartement={sirecDepartement}
    />
  );
}

const departementLabel = /Département en charge/i;

const numeroLabel = /Numéro de signalement associé/i;

const ouiLabel = /^Oui\b/;
const nonLabel = /^Non —/;
const nonRenseigneLabel = /^Non renseigné/;

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
    fireEvent.click(screen.getByLabelText(ouiLabel));
    expect(screen.getByLabelText(numeroLabel)).toBeInTheDocument();
    expect(screen.getByText(/séparer les valeurs par des virgules\. Exemples : 098655, 446789/i)).toBeInTheDocument();
  });

  it('masque les numéros quand on repasse à Non sans détruire la saisie', () => {
    render(<ControlledIdentification initialData={{ estLieAuSignalement: 'OUI', numerosSignalement: '098655' }} />);
    expect(screen.getByLabelText(numeroLabel)).toHaveValue('098655');
    fireEvent.click(screen.getByLabelText(nonLabel));
    expect(screen.queryByLabelText(numeroLabel)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(ouiLabel));
    expect(screen.getByLabelText(numeroLabel)).toHaveValue('098655');
  });

  it('permet de revenir à un état neutre via "Non renseigné"', () => {
    render(<ControlledIdentification initialData={{ estLieAuSignalement: 'OUI', numerosSignalement: '098655' }} />);
    fireEvent.click(screen.getByLabelText(nonRenseigneLabel));
    expect(screen.getByLabelText(nonRenseigneLabel)).toBeChecked();
    expect(screen.getByLabelText(ouiLabel)).not.toBeChecked();
    expect(screen.getByLabelText(nonLabel)).not.toBeChecked();
    expect(screen.queryByLabelText(numeroLabel)).not.toBeInTheDocument();
  });

  it('ne coche aucune option tant que la question est sans réponse', () => {
    render(<ControlledIdentification />);
    expect(screen.getByLabelText(ouiLabel)).not.toBeChecked();
    expect(screen.getByLabelText(nonLabel)).not.toBeChecked();
    expect(screen.getByLabelText(nonRenseigneLabel)).not.toBeChecked();
  });

  it('recoche "Non renseigné" quand la réponse a été enregistrée', () => {
    render(<ControlledIdentification initialData={{ estLieAuSignalement: 'NON_RENSEIGNE' }} />);
    expect(screen.getByLabelText(nonRenseigneLabel)).toBeChecked();
    expect(screen.getByLabelText(ouiLabel)).not.toBeChecked();
    expect(screen.getByLabelText(nonLabel)).not.toBeChecked();
  });

  it('accepte librement les numéros dans un format quelconque, sans restriction de caractères', () => {
    render(
      <ControlledIdentification
        initialData={{ estLieAuSignalement: 'OUI', numerosSignalement: 'SIG-2024/098-655, ABC.123' }}
      />,
    );
    expect(screen.getByLabelText(numeroLabel)).toHaveValue('SIG-2024/098-655, ABC.123');
  });

  it("n'affiche pas le champ Département en charge quand la requête n'est pas une reprise SIREC", () => {
    render(<ControlledIdentification />);
    expect(screen.queryByLabelText(departementLabel)).not.toBeInTheDocument();
  });

  it('affiche le champ Département en charge en lecture seule quand la requête est une reprise SIREC', () => {
    render(<ControlledIdentification isFromSirec sirecDepartement="75 - Paris" />);
    const input = screen.getByLabelText(departementLabel);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('75 - Paris');
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByText(/Donnée héritée de Sirec/i)).toBeInTheDocument();
  });

  it('affiche le champ Département en charge vide quand la valeur héritée est nulle', () => {
    render(<ControlledIdentification isFromSirec sirecDepartement={null} />);
    expect(screen.getByLabelText(departementLabel)).toHaveValue('');
  });
});
