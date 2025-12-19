import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import {
  AUTRE_PROFESSIONNEL_PRECISION,
  autreProfessionnelPrecisionLabels,
  MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION,
  MIS_EN_CAUSE_FAMILLE_PRECISION,
  MIS_EN_CAUSE_PROCHE_PRECISION,
  MIS_EN_CAUSE_TYPE,
  misEnCauseAutreNonProPrecisionLabels,
  misEnCauseFamillePrecisionLabels,
  misEnCauseProchePrecisionLabels,
  misEnCauseTypeLabels,
  PROFESSION_SANTE_PRECISION,
  PROFESSION_SOCIAL_PRECISION,
  professionSantePrecisionLabels,
  professionSocialPrecisionLabels,
} from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { PractitionerSearchField } from '@/components/common/PractitionerSearchField';
import { formatPractitionerName } from '@/utils/practitionerHelpers';

type misEnCauseProps = {
  formData: SituationData;
  isSaving: boolean;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
};

export function MisEnCause({ formData, isSaving, setFormData }: misEnCauseProps) {
  const misEnCauseType = formData.misEnCause?.misEnCauseType;

  const misEncauses = Object.entries(MIS_EN_CAUSE_TYPE).map(([key, value]) => ({
    key,
    value: misEnCauseTypeLabels[value],
  }));

  const misEnCauseProchePrecision = Object.entries(MIS_EN_CAUSE_PROCHE_PRECISION).map(([key, value]) => ({
    key,
    value: misEnCauseProchePrecisionLabels[value],
  }));

  const misEnCauseFamillePrecision = Object.entries(MIS_EN_CAUSE_FAMILLE_PRECISION).map(([key, value]) => ({
    key,
    value: misEnCauseFamillePrecisionLabels[value],
  }));

  const misEnCauseAutreNonProPrecision = Object.entries(MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION).map(([key, value]) => ({
    key,
    value: misEnCauseAutreNonProPrecisionLabels[value],
  }));

  const professionSantePrecision = Object.entries(PROFESSION_SANTE_PRECISION).map(([key, value]) => ({
    key,
    value: professionSantePrecisionLabels[value],
  }));

  const professionSocialPrecision = Object.entries(PROFESSION_SOCIAL_PRECISION).map(([key, value]) => ({
    key,
    value: professionSocialPrecisionLabels[value],
  }));

  const autreProfessionnelPrecision = Object.entries(AUTRE_PROFESSIONNEL_PRECISION).map(([key, value]) => ({
    key,
    value: autreProfessionnelPrecisionLabels[value],
  }));

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <h2 className="fr-h6 fr-mb-3w">Mis en cause</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <Select
            label="Type de mis en cause"
            nativeSelectProps={{
              value: misEnCauseType || '',
              onChange: (e) =>
                setFormData((prev) => ({
                  ...prev,
                  misEnCause: {
                    misEnCauseType: e.target.value || undefined,
                  },
                })),
            }}
          >
            <option value="">Sélectionner une option</option>
            {misEncauses.map(({ key, value }) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        {misEnCauseType === MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision"
              nativeSelectProps={{
                value: formData.misEnCause?.misEnCausePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, misEnCausePrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {misEnCauseFamillePrecision.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.PROCHE && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision"
              nativeSelectProps={{
                value: formData.misEnCause?.misEnCausePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, misEnCausePrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {misEnCauseProchePrecision.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.AUTRE && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision"
              nativeSelectProps={{
                value: formData.misEnCause?.misEnCausePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, misEnCausePrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {misEnCauseAutreNonProPrecision.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.PROFESSIONNEL && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision"
              nativeSelectProps={{
                value: formData.misEnCause?.misEnCausePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, misEnCausePrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {professionSantePrecision.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.PROFESSIONNEL && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision"
              nativeSelectProps={{
                value: formData.misEnCause?.misEnCausePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, misEnCausePrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {professionSocialPrecision.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.AUTRE && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision"
              nativeSelectProps={{
                value: formData.misEnCause?.misEnCausePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, misEnCausePrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {autreProfessionnelPrecision.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.PROFESSIONNEL && (
          <>
            <div className="fr-col-12 fr-col-md-6">
              <PractitionerSearchField
                value={formData.misEnCause?.rpps || ''}
                onChange={(value, practitioner) => {
                  if (practitioner) {
                    setFormData((prev) => ({
                      ...prev,
                      misEnCause: {
                        ...prev.misEnCause,
                        rpps: value,
                        commentaire: formatPractitionerName(practitioner),
                      },
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      misEnCause: {
                        ...prev.misEnCause,
                        rpps: value,
                      },
                    }));
                  }
                }}
                label="Numéro RPPS"
                disabled={isSaving}
                searchMode="rpps"
                hintText="Seul le numéro exact peut être trouvé"
                minSearchLength={6}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <PractitionerSearchField
                value={formData.misEnCause?.commentaire || ''}
                onChange={(value, practitioner) => {
                  if (practitioner) {
                    setFormData((prev) => ({
                      ...prev,
                      misEnCause: {
                        ...prev.misEnCause,
                        rpps: practitioner.rpps,
                        commentaire: value,
                      },
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      misEnCause: { ...prev.misEnCause, commentaire: value },
                    }));
                  }
                }}
                label="Identité du professionnel"
                disabled={isSaving}
                searchMode="name"
                minSearchLength={2}
              />
            </div>
          </>
        )}

        {misEnCauseType === MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE && (
          <div className="fr-col-12">
            <Input
              label="Identité du mis en cause"
              textArea
              nativeTextAreaProps={{
                value: formData.misEnCause?.commentaire || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, commentaire: e.target.value },
                  })),
                rows: 3,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
