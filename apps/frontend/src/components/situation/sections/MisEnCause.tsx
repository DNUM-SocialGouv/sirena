import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import {
  AUTRE_PROFESSIONNEL_PRECISION,
  autreProfessionnelPrecisionLabels,
  MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION,
  MIS_EN_CAUSE_FAMILLE_PRECISION,
  MIS_EN_CAUSE_PROCHE_PRECISION,
  MIS_EN_CAUSE_TYPE,
  misEnCauseAutreNonProPrecisionLabels,
  misEnCauseEtablissementPrecisionLabels,
  misEnCauseFamillePrecisionLabels,
  misEnCauseProchePrecisionLabels,
  misEnCauseTypeLabels,
  PROFESSION_SANTE_PRECISION,
  PROFESSION_SOCIAL_PRECISION,
  professionSantePrecisionLabels,
  professionSocialPrecisionLabels,
  type ReceptionType,
} from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { useEffect, useState } from 'react';
import { OrganizationSearchField } from '@/components/common/OrganizationSearchField';
import { PractitionerSearchField } from '@/components/common/PractitionerSearchField';

type misEnCauseProps = {
  formData: SituationData;
  isSaving: boolean;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  receptionType?: ReceptionType;
};

type MisEnCauseTypeSansAutreEtNpjm = keyof Omit<typeof MIS_EN_CAUSE_TYPE, 'AUTRE' | 'NPJM'>;

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

const misEnCauseEtablissementPrecision = Object.entries(MIS_EN_CAUSE_ETABLISSEMENT_PRECISION).map(([key, value]) => ({
  key,
  value: misEnCauseEtablissementPrecisionLabels[value],
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

const precisions: Record<MisEnCauseTypeSansAutreEtNpjm, { key: string; value: string }[]> = {
  [MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE]: misEnCauseFamillePrecision,
  [MIS_EN_CAUSE_TYPE.PROCHE]: misEnCauseProchePrecision,
  [MIS_EN_CAUSE_TYPE.AUTRE_PERSONNE_NON_PRO]: misEnCauseAutreNonProPrecision,
  [MIS_EN_CAUSE_TYPE.ETABLISSEMENT]: misEnCauseEtablissementPrecision,
  [MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE]: professionSantePrecision,
  [MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL]: professionSocialPrecision,
  [MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL]: autreProfessionnelPrecision,
};

type IdentityFieldsProps = {
  formData: SituationData;
  isSaving: boolean;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
};

function MisEnCauseIdentityFields({ formData, isSaving, setFormData }: IdentityFieldsProps) {
  const isIdentityReadOnly = isSaving || Boolean(formData.misEnCause?.rpps);
  console.log(isIdentityReadOnly);

  return (
    <>
      <div className="fr-col-12 fr-col-md-2">
        <Select
          label="Civilité"
          disabled={isIdentityReadOnly}
          nativeSelectProps={{
            value: formData.misEnCause?.civilite || '',
            onChange: (e) =>
              setFormData((prev) => ({
                ...prev,
                misEnCause: { ...prev.misEnCause, civilite: e.target.value || undefined },
              })),
          }}
        >
          <option value="">Sélectionner</option>
          <option value="M">M</option>
          <option value="MME">Mme</option>
        </Select>
      </div>
      <div className="fr-col-12 fr-col-md-5">
        <Input
          label="Nom"
          disabled={isIdentityReadOnly}
          nativeInputProps={{
            value: formData.misEnCause?.nom || '',
            onChange: (e) =>
              setFormData((prev) => ({
                ...prev,
                misEnCause: { ...prev.misEnCause, nom: e.target.value },
              })),
          }}
        />
      </div>
      <div className="fr-col-12 fr-col-md-5">
        <Input
          label="Prénom"
          disabled={isIdentityReadOnly}
          nativeInputProps={{
            value: formData.misEnCause?.prenom || '',
            onChange: (e) =>
              setFormData((prev) => ({
                ...prev,
                misEnCause: { ...prev.misEnCause, prenom: e.target.value },
              })),
          }}
        />
      </div>
    </>
  );
}

const MIS_EN_CAUSE_RPPS: string[] = [
  MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE,
  MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL,
  MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
];

const MIS_EN_CAUSE_SERVICE_PRECISIONS: string[] = [
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SERVICE,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SAMSAH,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SAVS,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SESSAD,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SPST,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SAEMO,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SAED,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.AUTRE,
];

export function MisEnCause({ formData, isSaving, setFormData }: misEnCauseProps) {
  const misEnCauseType = formData.misEnCause?.misEnCauseType;
  const misEnCausePrecision = formData.misEnCause?.misEnCauseTypePrecision;
  const misEnCausePrecisions =
    misEnCauseType && misEnCauseType in precisions ? precisions[misEnCauseType as MisEnCauseTypeSansAutreEtNpjm] : [];
  const hasCompleteIdentityFromRpps = Boolean(
    formData.misEnCause?.rpps &&
      formData.misEnCause?.civilite &&
      formData.misEnCause?.nom &&
      formData.misEnCause?.prenom,
  );
  const [isNoRppsChecked, setIsNoRppsChecked] = useState(
    () =>
      !formData.misEnCause?.rpps &&
      Boolean(formData.misEnCause?.civilite || formData.misEnCause?.nom || formData.misEnCause?.prenom),
  );

  const isServiceType =
    misEnCauseType === MIS_EN_CAUSE_TYPE.ETABLISSEMENT &&
    MIS_EN_CAUSE_SERVICE_PRECISIONS.includes(misEnCausePrecision || '');
  const isServiceReadOnly = isSaving || Boolean(formData.misEnCause?.finess);
  const hasCompleteServiceFromFiness = Boolean(formData.misEnCause?.finess && formData.misEnCause?.nomService);
  const [isNoFinessChecked, setIsNoFinessChecked] = useState(
    () => !formData.misEnCause?.finess && Boolean(formData.misEnCause?.nomService),
  );

  useEffect(() => {
    if (!isServiceType) {
      setIsNoFinessChecked(false);
    }
  }, [isServiceType]);

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend>
          <h2 className="fr-h6 fr-mb-3w">Mis en cause</h2>
        </legend>
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Type de mis en cause"
              nativeSelectProps={{
                value: misEnCauseType || '',
                onChange: (e) => {
                  const nextMisEnCauseType = e.target.value || undefined;
                  if (nextMisEnCauseType !== MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE) {
                    setIsNoRppsChecked(false);
                  }
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: {
                      misEnCauseType: nextMisEnCauseType,
                      misEnCauseTypePrecision: undefined,
                      finess: undefined,
                      nomService: undefined,
                      codePostal: undefined,
                      ville: undefined,
                    },
                  }));
                },
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

          {misEnCauseType && misEnCausePrecisions.length > 0 && (
            <div className="fr-col-12 fr-col-md-6">
              <Select
                label="Précision"
                nativeSelectProps={{
                  value: formData.misEnCause?.misEnCauseTypePrecision || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      misEnCause: {
                        ...prev.misEnCause,
                        misEnCauseTypePrecision: e.target.value || undefined,
                        finess: undefined,
                        nomService: undefined,
                        codePostal: undefined,
                        ville: undefined,
                      },
                    })),
                }}
              >
                <option value="">Sélectionner une option</option>
                {misEnCausePrecisions.map(({ key, value }) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {isServiceType && (
            <>
              <div className="fr-col-12 fr-col-md-6">
                <OrganizationSearchField
                  value={formData.misEnCause?.finess || ''}
                  onChange={(value, organization) => {
                    if (organization) {
                      setIsNoFinessChecked(false);
                      setFormData((prev) => ({
                        ...prev,
                        misEnCause: {
                          ...prev.misEnCause,
                          finess: value,
                          nomService: organization.name,
                          codePostal: organization.addressPostalcode,
                          ville: organization.addressCity,
                        },
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        misEnCause: { ...prev.misEnCause, finess: value },
                      }));
                    }
                  }}
                  label="Rechercher le service par numéro FINESS"
                  hintText="Saisir le numéro FINESS et sélectionner le service"
                  state={isNoFinessChecked ? 'info' : 'default'}
                  stateRelatedMessage={
                    isNoFinessChecked
                      ? 'Si vous souhaitez rechercher par numéro FINESS, décochez la case "Renseigner manuellement le nom du service"'
                      : undefined
                  }
                  disabled={isSaving || isNoFinessChecked}
                  searchMode="finess"
                  minSearchLength={6}
                />
                <a
                  className="fr-link fr-mt-1w"
                  href="https://annuaire.esante.gouv.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Répertoire FINESS <span className="fr-sr-only"> - nouvel onglet </span>
                </a>
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-mt-8w">
                  <Checkbox
                    options={[
                      {
                        label: 'Renseigner manuellement le nom du service',
                        nativeInputProps: {
                          checked: isNoFinessChecked,
                          onChange: (e) => {
                            const checked = e.target.checked;
                            setIsNoFinessChecked(checked);
                            setFormData((prev) => ({
                              ...prev,
                              misEnCause: {
                                ...prev.misEnCause,
                                finess: checked ? '' : prev.misEnCause?.finess || '',
                                ...(checked ? {} : { nomService: '', codePostal: '', ville: '' }),
                              },
                            }));
                          },
                          disabled: isSaving,
                        },
                      },
                    ]}
                  />
                </div>
              </div>

              {(isNoFinessChecked || hasCompleteServiceFromFiness) && (
                <>
                  <div className="fr-col-12 fr-col-md-6">
                    <Input
                      label="Nom du service"
                      disabled={isServiceReadOnly}
                      nativeInputProps={{
                        value: formData.misEnCause?.nomService || '',
                        onChange: (e) =>
                          setFormData((prev) => ({
                            ...prev,
                            misEnCause: { ...prev.misEnCause, nomService: e.target.value },
                          })),
                      }}
                    />
                  </div>
                  <div className="fr-col-12 fr-col-md-3">
                    <Input
                      label="Code postal"
                      disabled={isServiceReadOnly}
                      nativeInputProps={{
                        value: formData.misEnCause?.codePostal || '',
                        onChange: (e) =>
                          setFormData((prev) => ({
                            ...prev,
                            misEnCause: { ...prev.misEnCause, codePostal: e.target.value },
                          })),
                      }}
                    />
                  </div>
                  <div className="fr-col-12 fr-col-md-3">
                    <Input
                      label="Ville"
                      disabled={isServiceReadOnly}
                      nativeInputProps={{
                        value: formData.misEnCause?.ville || '',
                        onChange: (e) =>
                          setFormData((prev) => ({
                            ...prev,
                            misEnCause: { ...prev.misEnCause, ville: e.target.value },
                          })),
                      }}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {MIS_EN_CAUSE_RPPS.includes(misEnCauseType || '') && (
            <>
              <div className="fr-col-12 fr-col-md-6">
                <PractitionerSearchField
                  value={formData.misEnCause?.rpps || ''}
                  onChange={(value, practitioner) => {
                    if (practitioner) {
                      setIsNoRppsChecked(false);
                      setFormData((prev) => ({
                        ...prev,
                        misEnCause: {
                          ...prev.misEnCause,
                          rpps: value,
                          civilite: practitioner.prefix,
                          nom: practitioner.lastName || '',
                          prenom: practitioner.firstName || '',
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
                  label="Rechercher le professionnel par numéro RPPS"
                  state={isNoRppsChecked ? 'info' : 'default'}
                  stateRelatedMessage={
                    isNoRppsChecked
                      ? 'Si vous souhaitez rechercher par numéro RPPS, décochez la case “Le professionnel n’a pas de numéro RPPS”'
                      : undefined
                  }
                  disabled={isSaving || isNoRppsChecked}
                  searchMode="rpps"
                  hintText="Saisir le numéro RPPS et sélectionner le professionnel"
                  minSearchLength={6}
                />
                <a
                  className="fr-link fr-mt-1w"
                  href="https://annuaire.esante.gouv.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Répertoire RPPS <span className="fr-sr-only"> - nouvel onglet </span>
                </a>
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-mt-8w">
                  <Checkbox
                    options={[
                      {
                        label: "Le professionnel n'a pas de numéro RPPS",
                        nativeInputProps: {
                          checked: isNoRppsChecked,
                          onChange: (e) => {
                            const checked = e.target.checked;
                            setIsNoRppsChecked(checked);
                            setFormData((prev) => ({
                              ...prev,
                              misEnCause: {
                                ...prev.misEnCause,
                                rpps: checked ? '' : prev.misEnCause?.rpps || '',
                                ...(checked
                                  ? {}
                                  : {
                                      civilite: '',
                                      nom: '',
                                      prenom: '',
                                    }),
                              },
                            }));
                          },
                          disabled: isSaving,
                        },
                      },
                    ]}
                  />
                </div>
              </div>

              {(isNoRppsChecked || hasCompleteIdentityFromRpps) && (
                <MisEnCauseIdentityFields formData={formData} isSaving={isSaving} setFormData={setFormData} />
              )}
            </>
          )}

          {misEnCauseType === MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE && (
            <MisEnCauseIdentityFields formData={formData} isSaving={isSaving} setFormData={setFormData} />
          )}

          {MIS_EN_CAUSE_RPPS.includes(misEnCauseType || '') && (
            <>
              <div className="fr-col-12 fr-col-md-3">
                <Input
                  label="Code postal"
                  nativeInputProps={{
                    value: formData.misEnCause?.codePostal || '',
                    onChange: (e) =>
                      setFormData((prev) => ({
                        ...prev,
                        misEnCause: { ...prev.misEnCause, codePostal: e.target.value },
                      })),
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-3">
                <Input
                  label="Ville"
                  nativeInputProps={{
                    value: formData.misEnCause?.ville || '',
                    onChange: (e) =>
                      setFormData((prev) => ({
                        ...prev,
                        misEnCause: { ...prev.misEnCause, ville: e.target.value },
                      })),
                  }}
                />
              </div>
            </>
          )}
          <div className="fr-col-12">
            <Input
              label="Précisons supplémentaires concernant le mis en cause"
              textArea
              nativeTextAreaProps={{
                value: formData.misEnCause?.autrePrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    misEnCause: { ...prev.misEnCause, autrePrecision: e.target.value },
                  })),
                rows: 1,
              }}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
