import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import {
  LIEU_AUTRES_ETABLISSEMENTS_PRECISION,
  LIEU_DOMICILE_PRECISION,
  LIEU_ETABLISSEMENT_HANDICAP_PRECISION,
  LIEU_ETABLISSEMENT_PERSONNES_AGEES_PRECISION,
  LIEU_ETABLISSEMENT_SANTE_PRECISION,
  LIEU_ETABLISSEMENT_SOCIAL_PRECISION,
  LIEU_TRAJET_PRECISION,
  LIEU_TYPE,
  lieuAutresEtablissementsPrecisionLabels,
  lieuDomicilePrecisionLabels,
  lieuEtablissementHandicapPrecisionLabels,
  lieuEtablissementPersonnesAgeesPrecisionLabels,
  lieuEtablissementSantePrecisionLabels,
  lieuEtablissementSocialPrecisionLabels,
  lieuTrajetPrecisionLabels,
  lieuTypeLabels,
} from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { OrganizationSearchField } from '@/components/common/OrganizationSearchField';
import { buildOrganizationAddress, extractOrganizationName, updateOrganizationName } from '@/utils/organizationHelpers';

type LieuSurvenuProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  isSaving: boolean;
};

export function LieuSurvenu({ formData, setFormData, isSaving }: LieuSurvenuProps) {
  const lieuType = formData.lieuDeSurvenue?.lieuType;
  const lieuPrecision = formData.lieuDeSurvenue?.lieuPrecision;
  const shouldShowDomicileAddressFields =
    lieuType === LIEU_TYPE.DOMICILE &&
    !!lieuPrecision &&
    !(
      [
        LIEU_DOMICILE_PRECISION.PERSONNE_CONCERNEE,
        LIEU_DOMICILE_PRECISION.REQUERANT,
        LIEU_DOMICILE_PRECISION.EQUIPES_MOBILES,
      ] as string[]
    ).includes(lieuPrecision);

  const lieuTypeOptions = Object.entries(LIEU_TYPE).map(([key, value]) => ({
    key,
    value: lieuTypeLabels[value],
  }));
  const lieuDomicileOptions = Object.entries(LIEU_DOMICILE_PRECISION).map(([key, value]) => ({
    key,
    value: lieuDomicilePrecisionLabels[value],
  }));
  const lieuEtablissementSanteOptions = Object.entries(LIEU_ETABLISSEMENT_SANTE_PRECISION).map(([key, value]) => ({
    key,
    value: lieuEtablissementSantePrecisionLabels[value],
  }));
  const lieuEtablissementPersonnesAgeesOptions = Object.entries(LIEU_ETABLISSEMENT_PERSONNES_AGEES_PRECISION).map(
    ([key, value]) => ({
      key,
      value: lieuEtablissementPersonnesAgeesPrecisionLabels[value],
    }),
  );
  const lieuEtablissementHandicapOptions = Object.entries(LIEU_ETABLISSEMENT_HANDICAP_PRECISION).map(
    ([key, value]) => ({
      key,
      value: lieuEtablissementHandicapPrecisionLabels[value],
    }),
  );
  const lieuEtablissementSocialOptions = Object.entries(LIEU_ETABLISSEMENT_SOCIAL_PRECISION).map(([key, value]) => ({
    key,
    value: lieuEtablissementSocialPrecisionLabels[value],
  }));
  const lieuAutresEtablissementsOptions = Object.entries(LIEU_AUTRES_ETABLISSEMENTS_PRECISION).map(([key, value]) => ({
    key,
    value: lieuAutresEtablissementsPrecisionLabels[value],
  }));
  const lieuTrajetPrecisionOptions = Object.entries(LIEU_TRAJET_PRECISION).map(([key, value]) => ({
    key,
    value: lieuTrajetPrecisionLabels[value],
  }));

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <h2 className="fr-h6 fr-mb-3w">Lieu de survenue</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <Select
            label="Type de lieu"
            nativeSelectProps={{
              value: lieuType || '',
              onChange: (e) =>
                setFormData((prev) => ({
                  ...prev,
                  lieuDeSurvenue: {
                    lieuType: e.target.value || undefined,
                  },
                })),
            }}
          >
            <option value="">Sélectionner une option</option>
            {lieuTypeOptions.map(({ key, value }) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        {lieuType === LIEU_TYPE.DOMICILE && (
          <>
            <div className="fr-col-12 fr-col-md-6">
              <Select
                label="Précision du lieu"
                nativeSelectProps={{
                  value: formData.lieuDeSurvenue?.lieuPrecision || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                    })),
                }}
              >
                <option value="">Sélectionner une option</option>
                {lieuDomicileOptions.map(({ key, value }) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            {shouldShowDomicileAddressFields && (
              <>
                <div className="fr-col-12">
                  <Input
                    label="Nom de l'adresse"
                    nativeInputProps={{
                      value: formData.lieuDeSurvenue?.adresse?.label || '',
                      onChange: (e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lieuDeSurvenue: {
                            ...prev.lieuDeSurvenue,
                            adresse: { ...prev.lieuDeSurvenue?.adresse, label: e.target.value },
                          },
                        })),
                    }}
                  />
                </div>
                <div className="fr-col-12 fr-col-md-6">
                  <Input
                    label="Code postal"
                    nativeInputProps={{
                      value: formData.lieuDeSurvenue?.adresse?.codePostal || '',
                      onChange: (e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lieuDeSurvenue: {
                            ...prev.lieuDeSurvenue,
                            adresse: { ...prev.lieuDeSurvenue?.adresse, codePostal: e.target.value },
                          },
                        })),
                    }}
                  />
                </div>
                <div className="fr-col-12 fr-col-md-6">
                  <Input
                    label="Ville"
                    nativeInputProps={{
                      value: formData.lieuDeSurvenue?.adresse?.ville || '',
                      onChange: (e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lieuDeSurvenue: {
                            ...prev.lieuDeSurvenue,
                            adresse: { ...prev.lieuDeSurvenue?.adresse, ville: e.target.value },
                          },
                        })),
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}

        {lieuType === LIEU_TYPE.ETABLISSEMENT_SANTE && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision du lieu"
              nativeSelectProps={{
                value: formData.lieuDeSurvenue?.lieuPrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {lieuEtablissementSanteOptions.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {lieuType === LIEU_TYPE.ETABLISSEMENT_PERSONNES_AGEES && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision du lieu"
              nativeSelectProps={{
                value: formData.lieuDeSurvenue?.lieuPrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {lieuEtablissementPersonnesAgeesOptions.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {lieuType === LIEU_TYPE.ETABLISSEMENT_HANDICAP && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision du lieu"
              nativeSelectProps={{
                value: formData.lieuDeSurvenue?.lieuPrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {lieuEtablissementHandicapOptions.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {lieuType === LIEU_TYPE.ETABLISSEMENT_SOCIAL && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision du lieu"
              nativeSelectProps={{
                value: formData.lieuDeSurvenue?.lieuPrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {lieuEtablissementSocialOptions.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {lieuType === LIEU_TYPE.AUTRES_ETABLISSEMENTS && (
          <div className="fr-col-12 fr-col-md-6">
            <Select
              label="Précision du lieu"
              nativeSelectProps={{
                value: formData.lieuDeSurvenue?.lieuPrecision || '',
                onChange: (e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                  })),
              }}
            >
              <option value="">Sélectionner une option</option>
              {lieuAutresEtablissementsOptions.map(({ key, value }) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}

        {lieuType === LIEU_TYPE.TRAJET && (
          <>
            <div className="fr-col-12 fr-col-md-6">
              <Select
                label="Précision du lieu"
                nativeSelectProps={{
                  value: formData.lieuDeSurvenue?.lieuPrecision || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: { ...prev.lieuDeSurvenue, lieuPrecision: e.target.value || undefined },
                    })),
                }}
              >
                <option value="">Sélectionner une option</option>
                {lieuTrajetPrecisionOptions.map(({ key, value }) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Société de transport concernée"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.societeTransport || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: { ...prev.lieuDeSurvenue, societeTransport: e.target.value },
                    })),
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Code postal"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.codePostal || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: { ...prev.lieuDeSurvenue, codePostal: e.target.value },
                    })),
                }}
              />
            </div>
          </>
        )}

        {lieuType === LIEU_TYPE.ETABLISSEMENT_SANTE && (
          <>
            <div className="fr-col-12 fr-col-md-6">
              <OrganizationSearchField
                value={formData.lieuDeSurvenue?.finess || ''}
                onChange={(value, organization) => {
                  if (organization) {
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        finess: value,
                        adresse: buildOrganizationAddress(
                          organization.name,
                          organization.addressPostalcode,
                          organization.addressCity,
                        ),
                      },
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: { ...prev.lieuDeSurvenue, finess: value },
                    }));
                  }
                }}
                label="Numéro FINESS"
                disabled={isSaving}
                searchMode="finess"
                minSearchLength={6}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <OrganizationSearchField
                value={extractOrganizationName(formData.lieuDeSurvenue?.adresse)}
                onChange={(value, organization) => {
                  if (organization) {
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        finess: organization.identifier,
                        adresse: buildOrganizationAddress(
                          organization.name,
                          organization.addressPostalcode,
                          organization.addressCity,
                        ),
                      },
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        adresse: value === '' ? undefined : updateOrganizationName(prev.lieuDeSurvenue?.adresse, value),
                      },
                    }));
                  }
                }}
                label="Nom de l'établissement"
                disabled={isSaving}
                searchMode="name"
                minSearchLength={2}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Code postal"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.adresse?.codePostal || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        adresse: { ...prev.lieuDeSurvenue?.adresse, codePostal: e.target.value },
                      },
                    })),
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Ville"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.adresse?.ville || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        adresse: { ...prev.lieuDeSurvenue?.adresse, ville: e.target.value },
                      },
                    })),
                }}
              />
            </div>
          </>
        )}

        {lieuType &&
          (
            [
              LIEU_TYPE.ETABLISSEMENT_PERSONNES_AGEES,
              LIEU_TYPE.ETABLISSEMENT_HANDICAP,
              LIEU_TYPE.ETABLISSEMENT_SOCIAL,
            ] as string[]
          ).includes(lieuType) && (
            <>
              <div className="fr-col-12 fr-col-md-6">
                <OrganizationSearchField
                  value={formData.lieuDeSurvenue?.finess || ''}
                  onChange={(value, organization) => {
                    if (organization) {
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: {
                          ...prev.lieuDeSurvenue,
                          finess: value,
                          adresse: buildOrganizationAddress(
                            organization.name,
                            organization.addressPostalcode,
                            organization.addressCity,
                          ),
                        },
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: { ...prev.lieuDeSurvenue, finess: value },
                      }));
                    }
                  }}
                  label="Numéro FINESS"
                  disabled={isSaving}
                  searchMode="finess"
                  minSearchLength={6}
                />
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <OrganizationSearchField
                  value={extractOrganizationName(formData.lieuDeSurvenue?.adresse)}
                  onChange={(value, organization) => {
                    if (organization) {
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: {
                          ...prev.lieuDeSurvenue,
                          finess: organization.identifier,
                          adresse: buildOrganizationAddress(
                            organization.name,
                            organization.addressPostalcode,
                            organization.addressCity,
                          ),
                        },
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: {
                          ...prev.lieuDeSurvenue,
                          adresse:
                            value === '' ? undefined : updateOrganizationName(prev.lieuDeSurvenue?.adresse, value),
                        },
                      }));
                    }
                  }}
                  label="Nom de l'établissement"
                  disabled={isSaving}
                  searchMode="name"
                  minSearchLength={2}
                />
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label="Code postal"
                  nativeInputProps={{
                    value: formData.lieuDeSurvenue?.adresse?.codePostal || '',
                    onChange: (e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: {
                          ...prev.lieuDeSurvenue,
                          adresse: { ...prev.lieuDeSurvenue?.adresse, codePostal: e.target.value },
                        },
                      })),
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label="Ville"
                  nativeInputProps={{
                    value: formData.lieuDeSurvenue?.adresse?.ville || '',
                    onChange: (e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: {
                          ...prev.lieuDeSurvenue,
                          adresse: { ...prev.lieuDeSurvenue?.adresse, ville: e.target.value },
                        },
                      })),
                  }}
                />
              </div>
            </>
          )}

        {lieuType === LIEU_TYPE.AUTRES_ETABLISSEMENTS && (
          <>
            <div className="fr-col-12">
              <Input
                label="Nom de l'établissement"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.adresse?.label || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        adresse: { ...prev.lieuDeSurvenue?.adresse, label: e.target.value },
                      },
                    })),
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Code postal"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.adresse?.codePostal || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        adresse: { ...prev.lieuDeSurvenue?.adresse, codePostal: e.target.value },
                      },
                    })),
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Ville"
                nativeInputProps={{
                  value: formData.lieuDeSurvenue?.adresse?.ville || '',
                  onChange: (e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: {
                        ...prev.lieuDeSurvenue,
                        adresse: { ...prev.lieuDeSurvenue?.adresse, ville: e.target.value },
                      },
                    })),
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
