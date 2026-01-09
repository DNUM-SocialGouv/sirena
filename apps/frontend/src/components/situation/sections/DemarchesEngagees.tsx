import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { AUTORITE_TYPE, autoriteTypeLabels, DEMARCHES_ENGAGEES, demarcheEngageeLabels } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';

type DemarchesEngageesProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
};

export function DemarchesEngagees({ formData, setFormData }: DemarchesEngageesProps) {
  const demarches = formData.demarchesEngagees?.demarches || [];

  const handleMultiSelect = (section: 'fait' | 'demarchesEngagees', field: string) => (values: string[]) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: values,
      },
    }));
  };

  const handleDemarchesInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        demarchesEngagees: {
          ...prev.demarchesEngagees,
          [field]: e.target.value,
        },
      }));
    };

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <h2 className="fr-h6 fr-mb-3w">Démarches engagées par le déclarant</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12">
          <Checkbox
            options={[
              {
                label: demarcheEngageeLabels[DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES],
                nativeInputProps: {
                  value: DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES,
                  checked: demarches.includes(DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES),
                  onChange: (e) => {
                    if (e.target.checked) {
                      handleMultiSelect(
                        'demarchesEngagees',
                        'demarches',
                      )([...demarches, DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES]);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        demarchesEngagees: {
                          ...prev.demarchesEngagees,
                          demarches: demarches.filter((v: string) => v !== DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES),
                          dateContactResponsables: undefined,
                          reponseRecueResponsables: undefined,
                        },
                      }));
                    }
                  },
                },
              },
            ]}
          />
        </div>

        {demarches.includes(DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES) && (
          <div className="fr-col-12 fr-pl-6w">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label="Date de prise de contact"
                  nativeInputProps={{
                    type: 'date',
                    value: formData.demarchesEngagees?.dateContactResponsables || '',
                    onChange: handleDemarchesInputChange('dateContactResponsables'),
                  }}
                />
              </div>
              <div className="fr-col-12">
                <Checkbox
                  options={[
                    {
                      label: 'Le déclarant a reçu une réponse',
                      nativeInputProps: {
                        checked: formData.demarchesEngagees?.reponseRecueResponsables === true,
                        onChange: (e) =>
                          setFormData((prev) => ({
                            ...prev,
                            demarchesEngagees: {
                              ...prev.demarchesEngagees,
                              reponseRecueResponsables: e.target.checked || undefined,
                            },
                          })),
                      },
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        <div className="fr-col-12">
          <Checkbox
            options={[
              {
                label: demarcheEngageeLabels[DEMARCHES_ENGAGEES.CONTACT_ORGANISME],
                nativeInputProps: {
                  value: DEMARCHES_ENGAGEES.CONTACT_ORGANISME,
                  checked: demarches.includes(DEMARCHES_ENGAGEES.CONTACT_ORGANISME),
                  onChange: (e) => {
                    if (e.target.checked) {
                      handleMultiSelect(
                        'demarchesEngagees',
                        'demarches',
                      )([...demarches, DEMARCHES_ENGAGEES.CONTACT_ORGANISME]);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        demarchesEngagees: {
                          ...prev.demarchesEngagees,
                          demarches: demarches.filter((v: string) => v !== DEMARCHES_ENGAGEES.CONTACT_ORGANISME),
                          precisionsOrganisme: undefined,
                        },
                      }));
                    }
                  },
                },
              },
            ]}
          />
        </div>

        {demarches.includes(DEMARCHES_ENGAGEES.CONTACT_ORGANISME) && (
          <div className="fr-col-12 fr-pl-6w">
            <Input
              label="Précisions sur l'organisme contacté"
              textArea
              nativeTextAreaProps={{
                value: formData.demarchesEngagees?.precisionsOrganisme || '',
                onChange: handleDemarchesInputChange('precisionsOrganisme'),
                rows: 3,
              }}
            />
          </div>
        )}

        <div className="fr-col-12">
          <Checkbox
            options={[
              {
                label: demarcheEngageeLabels[DEMARCHES_ENGAGEES.PLAINTE],
                nativeInputProps: {
                  value: DEMARCHES_ENGAGEES.PLAINTE,
                  checked: demarches.includes(DEMARCHES_ENGAGEES.PLAINTE),
                  onChange: (e) => {
                    if (e.target.checked) {
                      handleMultiSelect('demarchesEngagees', 'demarches')([...demarches, DEMARCHES_ENGAGEES.PLAINTE]);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        demarchesEngagees: {
                          ...prev.demarchesEngagees,
                          demarches: demarches.filter((v: string) => v !== DEMARCHES_ENGAGEES.PLAINTE),
                          dateDepotPlainte: undefined,
                          lieuDepotPlainte: undefined,
                        },
                      }));
                    }
                  },
                },
              },
            ]}
          />
        </div>

        {demarches.includes(DEMARCHES_ENGAGEES.PLAINTE) && (
          <div className="fr-col-12 fr-pl-6w">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label="Date du dépôt de plainte"
                  nativeInputProps={{
                    type: 'date',
                    value: formData.demarchesEngagees?.dateDepotPlainte || '',
                    onChange: handleDemarchesInputChange('dateDepotPlainte'),
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <Select
                  label="Lieu de dépôt de la plainte"
                  nativeSelectProps={{
                    value: formData.demarchesEngagees?.lieuDepotPlainte || '',
                    onChange: (e) =>
                      setFormData((prev) => ({
                        ...prev,
                        demarchesEngagees: {
                          ...prev.demarchesEngagees,
                          lieuDepotPlainte: e.target.value || undefined,
                        },
                      })),
                  }}
                >
                  <option value="">Sélectionner une option</option>
                  {Object.entries(AUTORITE_TYPE).map(([key, value]) => (
                    <option key={key} value={value}>
                      {autoriteTypeLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}
        {demarches.includes(DEMARCHES_ENGAGEES.AUTRE) && (
          <div className="fr-col-12">
            <Input
              label="Précisez les autres démarches engagées"
              nativeInputProps={{
                type: 'date',
                value: formData.demarchesEngagees?.commentaire || '',
                onChange: handleDemarchesInputChange('commentaire'),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
