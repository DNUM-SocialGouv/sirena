import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import type { SituationData } from '@sirena/common/schemas';
import { useEffect } from 'react';

const NUMEROS_SIGNALEMENT_REGEX = /^\s*[a-zA-Z0-9]+(\s*,\s*[a-zA-Z0-9]+)*\s*$/;

const isNumerosSignalementValid = (value?: string) =>
  !value || value.trim() === '' || NUMEROS_SIGNALEMENT_REGEX.test(value);

type IdentificationProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  isSaving: boolean;
  onValidationChange?: (isValid: boolean) => void;
};

export function Identification({ formData, setFormData, isSaving, onValidationChange }: IdentificationProps) {
  const estLieAuSignalement = formData.estLieAuSignalement;
  const hasError = estLieAuSignalement === true && !isNumerosSignalementValid(formData.numerosSignalement);

  useEffect(() => {
    onValidationChange?.(!hasError);
  }, [hasError, onValidationChange]);

  const handleEstLieChange = (value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      estLieAuSignalement: value,
      numerosSignalement: value ? prev.numerosSignalement : undefined,
    }));
  };

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend>
          <h2 className="fr-h6 fr-mb-3w">Identification</h2>
        </legend>

        <RadioButtons
          legend="Situation en lien avec un ou plusieurs signalement(s)"
          name="situation-est-lie-au-signalement"
          orientation="horizontal"
          disabled={isSaving}
          options={[
            {
              label: 'Oui',
              nativeInputProps: {
                value: 'true',
                checked: estLieAuSignalement === true,
                onChange: () => handleEstLieChange(true),
              },
            },
            {
              label: 'Non',
              nativeInputProps: {
                value: 'false',
                checked: estLieAuSignalement === false,
                onChange: () => handleEstLieChange(false),
              },
            },
          ]}
        />

        {estLieAuSignalement === true && (
          <Input
            label="Numéro de signalement associé"
            hintText="Si plusieurs signalements, séparer les valeurs par des virgules. Exemples : 098655, 446789"
            state={hasError ? 'error' : 'default'}
            stateRelatedMessage={
              hasError
                ? 'Le champ « Numéro de signalement associé » doit contenir uniquement des lettres et des chiffres. Saisissez une ou plusieurs valeurs séparées par des virgules. Exemple : 098655, 446789.'
                : undefined
            }
            nativeInputProps={{
              value: formData.numerosSignalement || '',
              onChange: (e) =>
                setFormData((prev) => ({
                  ...prev,
                  numerosSignalement: e.target.value,
                })),
              disabled: isSaving,
            }}
          />
        )}
      </fieldset>
    </div>
  );
}
