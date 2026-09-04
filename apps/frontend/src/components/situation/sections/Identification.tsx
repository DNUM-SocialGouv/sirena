import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { REPONSE_OUI_NON } from '@sirena/common/constants';
import type { ReponseOuiNon, SituationData } from '@sirena/common/schemas';
import { useId } from 'react';
import { ReadOnlyField } from '@/components/common/ReadOnlyField';
import { buildOuiNonOptions } from '@/lib/radioOptions';

type IdentificationProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  isSaving: boolean;
  isFromSirec?: boolean;
  sirecDepartement?: string | null;
};

export function Identification({
  formData,
  setFormData,
  isSaving,
  isFromSirec,
  sirecDepartement,
}: IdentificationProps) {
  const departementEnChargeId = useId();
  const estLieAuSignalement = formData.estLieAuSignalement;

  const handleEstLieChange = (value: ReponseOuiNon) => {
    setFormData((prev) => ({ ...prev, estLieAuSignalement: value }));
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
          options={buildOuiNonOptions(estLieAuSignalement, handleEstLieChange, 'signalement associé')}
        />

        <div aria-live="polite">
          {estLieAuSignalement === REPONSE_OUI_NON.OUI && (
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
        </div>

        {isFromSirec ? (
          <ReadOnlyField
            id={departementEnChargeId}
            label="Département en charge"
            hintText="Donnée héritée de Sirec"
            value={sirecDepartement ?? ''}
          />
        ) : null}
      </fieldset>
    </div>
  );
}
