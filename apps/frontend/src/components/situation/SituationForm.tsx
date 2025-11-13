import { Button } from '@codegouvfr/react-dsfr/Button';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import {
  AUTORITE_TYPE,
  AUTRE_PROFESSIONNEL_PRECISION,
  autoriteTypeLabels,
  autreProfessionnelPrecisionLabels,
  CONSEQUENCE,
  consequenceLabels,
  DEMARCHES_ENGAGEES,
  demarcheEngageeLabels,
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
  MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION,
  MIS_EN_CAUSE_FAMILLE_PRECISION,
  MIS_EN_CAUSE_PROCHE_PRECISION,
  MIS_EN_CAUSE_TYPE,
  MOTIFS_HIERARCHICAL_DATA,
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
import { SelectWithChildren } from '@sirena/ui';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FileUploadSection } from '@/components/common/FileUploadSection';
import { OrganizationSearchField } from '@/components/common/OrganizationSearchField';
import { PractitionerSearchField } from '@/components/common/PractitionerSearchField';

interface SituationFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  situationId?: string;
  initialData?: SituationData;
  onSave: (data: SituationData, shouldCreateRequest: boolean, faitFiles: File[]) => Promise<void>;
}

export function SituationForm({ mode, requestId, situationId, initialData, onSave }: SituationFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SituationData>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [faitFiles, setFaitFiles] = useState<File[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const lieuType = formData.lieuDeSurvenue?.lieuType;
  const misEnCauseType = formData.misEnCause?.misEnCauseType;
  const demarches = formData.demarchesEngagees?.demarches || [];

  const handleFaitInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({
        ...prev,
        fait: {
          ...prev.fait,
          [field]: e.target.value,
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

  const handleMultiSelect = (section: 'fait' | 'demarchesEngagees', field: string) => (values: string[]) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: values,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const hasAnyData =
        Object.keys(formData).length > 0 &&
        Object.values(formData).some((section) => {
          if (!section || typeof section !== 'object') return false;
          return Object.values(section).some((value) => {
            if (Array.isArray(value)) return value.length > 0;
            return value !== undefined && value !== '' && value !== false;
          });
        });

      const shouldCreateRequest = mode === 'create' && !requestId && hasAnyData;
      await onSave(formData, shouldCreateRequest, faitFiles);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'create' && !requestId) {
      navigate({ to: '/home' });
    } else if (requestId) {
      navigate({ to: '/request/$requestId', params: { requestId } });
    } else {
      window.history.back();
    }
  };

  const backUrl = mode === 'create' && !requestId ? '/request/create' : requestId ? `/request/${requestId}` : '/home';

  return (
    <div>
      <div className="fr-container fr-mt-4w">
        <div className="fr-mb-3w">
          <Link className="fr-link" to={backUrl}>
            <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
            Détails de la requête
          </Link>
        </div>

        <h1 className="fr-mb-2w">Mis en cause et détails des faits</h1>
        <p className="fr-text--sm fr-mb-5w">Tous les champs sont facultatifs</p>

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
                        ...prev.misEnCause,
                        misEnCauseType: e.target.value || undefined,
                        misEnCausePrecision: undefined,
                      },
                    })),
                }}
              >
                <option value="">Sélectionner une option</option>
                {Object.entries(MIS_EN_CAUSE_TYPE).map(([key, value]) => (
                  <option key={key} value={value}>
                    {misEnCauseTypeLabels[value]}
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
                  {Object.entries(MIS_EN_CAUSE_FAMILLE_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {misEnCauseFamillePrecisionLabels[value]}
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
                  {Object.entries(MIS_EN_CAUSE_PROCHE_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {misEnCauseProchePrecisionLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {misEnCauseType === MIS_EN_CAUSE_TYPE.AUTRE_PERSONNE_NON_PRO && (
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
                  {Object.entries(MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {misEnCauseAutreNonProPrecisionLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {misEnCauseType === MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE && (
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
                  {Object.entries(PROFESSION_SANTE_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {professionSantePrecisionLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {misEnCauseType === MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL && (
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
                  {Object.entries(PROFESSION_SOCIAL_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {professionSocialPrecisionLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {misEnCauseType === MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL && (
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
                  {Object.entries(AUTRE_PROFESSIONNEL_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {autreProfessionnelPrecisionLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {misEnCauseType === MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE && (
              <div className="fr-col-12">
                <PractitionerSearchField
                  value={formData.misEnCause?.rpps || ''}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      misEnCause: { ...prev.misEnCause, rpps: value },
                    }))
                  }
                  disabled={isSaving}
                />
              </div>
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
                        ...prev.lieuDeSurvenue,
                        lieuType: e.target.value || undefined,
                        lieuPrecision: undefined,
                      },
                    })),
                }}
              >
                <option value="">Sélectionner une option</option>
                {Object.entries(LIEU_TYPE).map(([key, value]) => (
                  <option key={key} value={value}>
                    {lieuTypeLabels[value]}
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
                    {Object.entries(LIEU_DOMICILE_PRECISION).map(([key, value]) => (
                      <option key={key} value={value}>
                        {lieuDomicilePrecisionLabels[value]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="fr-col-12">
                  <Input
                    label="Adresse"
                    nativeInputProps={{
                      value: formData.lieuDeSurvenue?.adresse || '',
                      onChange: (e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lieuDeSurvenue: { ...prev.lieuDeSurvenue, adresse: e.target.value },
                        })),
                    }}
                  />
                </div>
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
                  {Object.entries(LIEU_ETABLISSEMENT_SANTE_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {lieuEtablissementSantePrecisionLabels[value]}
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
                  {Object.entries(LIEU_ETABLISSEMENT_PERSONNES_AGEES_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {lieuEtablissementPersonnesAgeesPrecisionLabels[value]}
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
                  {Object.entries(LIEU_ETABLISSEMENT_HANDICAP_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {lieuEtablissementHandicapPrecisionLabels[value]}
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
                  {Object.entries(LIEU_ETABLISSEMENT_SOCIAL_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {lieuEtablissementSocialPrecisionLabels[value]}
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
                  {Object.entries(LIEU_AUTRES_ETABLISSEMENTS_PRECISION).map(([key, value]) => (
                    <option key={key} value={value}>
                      {lieuAutresEtablissementsPrecisionLabels[value]}
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
                    {Object.entries(LIEU_TRAJET_PRECISION).map(([key, value]) => (
                      <option key={key} value={value}>
                        {lieuTrajetPrecisionLabels[value]}
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
              <div className="fr-col-12">
                <OrganizationSearchField
                  value={formData.lieuDeSurvenue?.finess || ''}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      lieuDeSurvenue: { ...prev.lieuDeSurvenue, finess: value },
                    }))
                  }
                  disabled={isSaving}
                />
              </div>
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
                  <div className="fr-col-12">
                    <OrganizationSearchField
                      value={formData.lieuDeSurvenue?.finess || ''}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          lieuDeSurvenue: { ...prev.lieuDeSurvenue, finess: value },
                        }))
                      }
                      label="Numéro FINESS"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="fr-col-12">
                    <Input
                      label="Adresse"
                      nativeInputProps={{
                        value: formData.lieuDeSurvenue?.adresse || '',
                        onChange: (e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lieuDeSurvenue: { ...prev.lieuDeSurvenue, adresse: e.target.value },
                          })),
                      }}
                    />
                  </div>
                </>
              )}

            {lieuType === LIEU_TYPE.AUTRES_ETABLISSEMENTS && (
              <div className="fr-col-12">
                <Input
                  label="Adresse"
                  nativeInputProps={{
                    value: formData.lieuDeSurvenue?.adresse || '',
                    onChange: (e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lieuDeSurvenue: { ...prev.lieuDeSurvenue, adresse: e.target.value },
                      })),
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <h2 className="fr-h6 fr-mb-3w">Description des faits</h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12">
              <SelectWithChildren
                options={MOTIFS_HIERARCHICAL_DATA}
                value={formData.fait?.motifs || []}
                onChange={(values) =>
                  setFormData((prev) => ({
                    ...prev,
                    fait: {
                      ...prev.fait,
                      motifs: values,
                    },
                  }))
                }
              />
            </div>

            <div className="fr-col-12">
              <SelectWithChildren
                label="Conséquences sur la personne"
                options={Object.entries(CONSEQUENCE).map(([key]) => ({
                  label: consequenceLabels[key as keyof typeof CONSEQUENCE],
                  value: key,
                }))}
                value={formData.fait?.consequences || []}
                onChange={(values) =>
                  setFormData((prev) => ({
                    ...prev,
                    fait: {
                      ...prev.fait,
                      consequences: values,
                    },
                  }))
                }
              />
            </div>

            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Date de début des faits"
                nativeInputProps={{
                  type: 'date',
                  value: formData.fait?.dateDebut || '',
                  onChange: handleFaitInputChange('dateDebut'),
                }}
              />
            </div>

            <div className="fr-col-12 fr-col-md-6">
              <Input
                label="Date de fin des faits"
                nativeInputProps={{
                  type: 'date',
                  value: formData.fait?.dateFin || '',
                  onChange: handleFaitInputChange('dateFin'),
                }}
              />
            </div>

            <div className="fr-col-12">
              <Input
                label="Explication des faits par le déclarant"
                textArea
                nativeTextAreaProps={{
                  value: formData.fait?.commentaire || '',
                  onChange: handleFaitInputChange('commentaire'),
                  rows: 4,
                }}
              />
            </div>

            <div className="fr-col-12">
              <Input
                label="Autres précisions"
                textArea
                nativeTextAreaProps={{
                  value: formData.fait?.autresPrecisions || '',
                  onChange: handleFaitInputChange('autresPrecisions'),
                  rows: 4,
                }}
              />
            </div>
          </div>
        </div>

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
                        const updated = e.target.checked
                          ? [...demarches, DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES]
                          : demarches.filter((v: string) => v !== DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES);
                        handleMultiSelect('demarchesEngagees', 'demarches')(updated);
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
                        const updated = e.target.checked
                          ? [...demarches, DEMARCHES_ENGAGEES.CONTACT_ORGANISME]
                          : demarches.filter((v: string) => v !== DEMARCHES_ENGAGEES.CONTACT_ORGANISME);
                        handleMultiSelect('demarchesEngagees', 'demarches')(updated);
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
                        const updated = e.target.checked
                          ? [...demarches, DEMARCHES_ENGAGEES.PLAINTE]
                          : demarches.filter((v: string) => v !== DEMARCHES_ENGAGEES.PLAINTE);
                        handleMultiSelect('demarchesEngagees', 'demarches')(updated);
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
          </div>
        </div>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <h2 className="fr-h6 fr-mb-3w">Pièces jointes</h2>
          <FileUploadSection
            label="Ajouter des fichiers relatifs aux faits"
            existingFiles={formData.fait?.files}
            getFileUrl={
              situationId
                ? (fileId) => `/api/requetes-entite/${requestId}/situation/${situationId}/file/${fileId}`
                : undefined
            }
            selectedFiles={faitFiles}
            onFilesChange={setFaitFiles}
            disabled={isSaving}
          />
        </div>

        <div className="fr-btns-group fr-btns-group--inline-md fr-mb-6w">
          <Button priority="secondary" onClick={handleCancel} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
