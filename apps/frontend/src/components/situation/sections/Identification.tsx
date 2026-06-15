import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import type { SituationData } from '@sirena/common/schemas';

type IdentificationProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  isSaving: boolean;
};

export function Identification({ formData, setFormData, isSaving }: IdentificationProps) {
  const estLieAuSignalement = formData.estLieAuSignalement;

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
