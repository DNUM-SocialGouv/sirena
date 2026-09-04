import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { mappers } from '@sirena/common';
import { MESURE_PROTECTION, REPONSE_OUI_NON } from '@sirena/common/constants';
import {
  type MesureProtection,
  optionalEmailSchema,
  optionalPhoneSchema,
  type ReponseOuiNon,
} from '@sirena/common/schemas';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import { DomicileFields } from '@/components/common/DomicileFields';
import { personneConcerneeFieldMetadata } from '@/lib/fieldMetadata';
import type { PersonneConcerneeData } from '@/lib/personneConcernee';
import { buildNonRenseigneOption, buildOuiNonOptions } from '@/lib/radioOptions';

interface PersonneConcerneeFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  initialData?: PersonneConcerneeData;
  onSave: (data: PersonneConcerneeData, shouldCreateRequest: boolean) => Promise<void>;
}

const INVALID_DATE_NAISSANCE_MESSAGE = 'Le champ “Date de naissance” n’est pas valide. Format attendu : JJ/MM/AAAA';

export function PersonneConcerneeForm({ mode, requestId, initialData, onSave }: PersonneConcerneeFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PersonneConcerneeData>(initialData || {});
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [dateNaissanceError, setDateNaissanceError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const dateNaissanceInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange =
    (field: keyof PersonneConcerneeData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData((prev: PersonneConcerneeData) => ({ ...prev, [field]: value }));

      if (hasAttemptedSave) {
        if (field === 'courrierElectronique') {
          try {
            optionalEmailSchema.parse(value);
            setEmailError(undefined);
          } catch (error) {
            if (error instanceof z.ZodError) {
              setEmailError(error.issues[0].message);
            }
          }
        }

        if (field === 'numeroTelephone') {
          try {
            optionalPhoneSchema.parse(value);
            setPhoneError(undefined);
          } catch (error) {
            if (error instanceof z.ZodError) {
              setPhoneError(error.issues[0].message);
            }
          }
        }
      }
    };

  const handleReponseChange = (field: keyof PersonneConcerneeData, value: ReponseOuiNon) => {
    setFormData((prev: PersonneConcerneeData) => ({ ...prev, [field]: value }));
  };

  const handleMesureProtectionChange = (value: MesureProtection) => {
    setFormData((prev: PersonneConcerneeData) => ({ ...prev, mesureProtection: value }));
  };

  const handleSave = useCallback(async () => {
    setHasAttemptedSave(true);

    let hasEmailError = false;
    let hasPhoneError = false;

    const dateNaissanceInput = dateNaissanceInputRef.current;
    const hasDateNaissanceError = Boolean(dateNaissanceInput && !dateNaissanceInput.validity.valid);
    setDateNaissanceError(hasDateNaissanceError ? INVALID_DATE_NAISSANCE_MESSAGE : undefined);

    if (formData.courrierElectronique) {
      try {
        optionalEmailSchema.parse(formData.courrierElectronique);
        setEmailError(undefined);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setEmailError(error.issues[0].message);
          hasEmailError = true;
        }
      }
    }

    if (formData.numeroTelephone) {
      try {
        optionalPhoneSchema.parse(formData.numeroTelephone);
        setPhoneError(undefined);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setPhoneError(error.issues[0].message);
          hasPhoneError = true;
        }
      }
    }

    if (hasDateNaissanceError || hasPhoneError || hasEmailError) {
      // Move focus to the first field in error, following DOM order (birth date, then phone, then email)
      const firstErrorField = hasDateNaissanceError
        ? dateNaissanceInputRef.current
        : hasPhoneError
          ? phoneInputRef.current
          : emailInputRef.current;
      firstErrorField?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const hasAnyData = Object.values(formData).some(
        (value) => value !== undefined && value !== '' && value !== false,
      );

      const shouldCreateRequest = mode === 'create' && !requestId && hasAnyData;
      await onSave(formData, shouldCreateRequest);
    } finally {
      setIsSaving(false);
    }
  }, [formData, mode, requestId, onSave]);

  const handleCancel = useCallback(() => {
    if (mode === 'create' && !requestId) {
      navigate({ to: '/request/create' });
    } else if (requestId) {
      navigate({ to: '/request/$requestId', params: { requestId } });
    } else {
      window.history.back();
    }
  }, [mode, requestId, navigate]);

  const backUrl = mode === 'create' && !requestId ? '/request/create' : requestId ? `/request/${requestId}` : '/home';

  return (
    <div>
      <div className="fr-container fr-mt-4w">
        <div className="fr-mb-3w">
          <Link className="fr-link" to={backUrl}>
            <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
            Retour
          </Link>
        </div>

        <h1 className="fr-mb-2w">Personne concernée</h1>
        <p className="fr-text--sm fr-mb-5w">Tous les champs sont facultatifs</p>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <h2 className="fr-h6 fr-mb-3w">Identité</h2>
            </legend>

            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-3">
                <Select
                  label={personneConcerneeFieldMetadata.civilite.label}
                  nativeSelectProps={{
                    value: formData.civilite ?? '',
                    onChange: (e) => {
                      const value = e.target.value;
                      setFormData((prev: PersonneConcerneeData) => ({ ...prev, civilite: value || undefined }));
                    },
                  }}
                >
                  <option value="">Sélectionner</option>
                  {mappers.civiliteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="fr-col-12 fr-col-md-4">
                <Input
                  label={personneConcerneeFieldMetadata.nom.label}
                  nativeInputProps={{
                    value: formData.nom || '',
                    onChange: handleInputChange('nom'),
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-5">
                <Input
                  label={personneConcerneeFieldMetadata.prenom.label}
                  nativeInputProps={{
                    value: formData.prenom || '',
                    onChange: handleInputChange('prenom'),
                  }}
                />
              </div>
            </div>

            <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--top">
              <div className="fr-col-12 fr-col-md-6">
                <Select
                  label={personneConcerneeFieldMetadata.age.label}
                  hint={<span aria-hidden="true">&nbsp;</span>}
                  nativeSelectProps={{
                    value: formData.age ?? '',
                    onChange: (e) => {
                      const value = e.target.value;
                      setFormData((prev: PersonneConcerneeData) => ({ ...prev, age: value || undefined }));
                    },
                  }}
                >
                  <option value="">Sélectionner une tranche d'âge</option>
                  {mappers.ageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label={personneConcerneeFieldMetadata.dateNaissance.label}
                  hintText="Format attendu : JJ/MM/AAAA"
                  state={dateNaissanceError ? 'error' : 'default'}
                  stateRelatedMessage={dateNaissanceError}
                  nativeInputProps={{
                    ref: dateNaissanceInputRef,
                    type: 'date',
                    max: new Date().toISOString().split('T')[0],
                    value: formData.dateNaissance || '',
                    onChange: (e) => {
                      const value = e.target.value;
                      const isValid = e.currentTarget.validity.valid;
                      setFormData((prev: PersonneConcerneeData) => ({ ...prev, dateNaissance: value || undefined }));
                      if (isValid) {
                        setDateNaissanceError(undefined);
                      }
                    },
                  }}
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <h2 className="fr-h6 fr-mb-3w">Informations de contact</h2>
            </legend>
            <DomicileFields
              values={{
                adresseDomicile: formData.adresseDomicile || '',
                codePostal: formData.codePostal || '',
                ville: formData.ville || '',
              }}
              onChange={(v) => setFormData((prev) => ({ ...prev, ...v }))}
              labels={{
                adresseDomicile: personneConcerneeFieldMetadata.adresseDomicile.label,
                codePostal: personneConcerneeFieldMetadata.codePostal.label,
                ville: personneConcerneeFieldMetadata.ville.label,
              }}
            />
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label={personneConcerneeFieldMetadata.numeroTelephone.label}
                  hintText="Format attendu : 10 chiffres (français) ou +33XXXXXXXXXX (international)"
                  state={phoneError ? 'error' : undefined}
                  stateRelatedMessage={phoneError}
                  nativeInputProps={{
                    ref: phoneInputRef,
                    value: formData.numeroTelephone || '',
                    onChange: handleInputChange('numeroTelephone'),
                    type: 'tel',
                    maxLength: 15,
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label={personneConcerneeFieldMetadata.courrierElectronique.label}
                  hintText="Exemple : prenom.nom@exemple.com"
                  state={emailError ? 'error' : undefined}
                  stateRelatedMessage={emailError}
                  nativeInputProps={{
                    ref: emailInputRef,
                    value: formData.courrierElectronique || '',
                    onChange: handleInputChange('courrierElectronique'),
                    type: 'email',
                  }}
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <h2 className="fr-h6 fr-mb-3w">Informations complémentaires</h2>
            </legend>
            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.consentCommuniquerIdentite.label}
                name="personne-concernee-consent-identite"
                orientation="horizontal"
                options={buildOuiNonOptions(
                  formData.consentCommuniquerIdentite,
                  (value) => handleReponseChange('consentCommuniquerIdentite', value),
                  'communication de son identité',
                )}
              />
            </div>

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.estVictimeInformee.label}
                name="personne-concernee-est-victime-informee"
                orientation="horizontal"
                options={buildOuiNonOptions(
                  formData.estVictimeInformee,
                  (value) => handleReponseChange('estVictimeInformee', value),
                  'personne informée de la démarche',
                )}
              />
            </div>
            <div aria-live="polite">
              {formData.estVictimeInformee === REPONSE_OUI_NON.NON && (
                <div className="fr-mb-3w">
                  <Input
                    label={personneConcerneeFieldMetadata.victimeInformeeCommentaire.label}
                    nativeInputProps={{
                      value: formData.victimeInformeeCommentaire || '',
                      onChange: handleInputChange('victimeInformeeCommentaire'),
                    }}
                  />
                </div>
              )}
            </div>

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.mesureProtection.label}
                name="personne-concernee-mesure-protection"
                orientation="horizontal"
                options={[
                  {
                    label: 'Mandataire judiciaire',
                    nativeInputProps: {
                      value: MESURE_PROTECTION.MANDATAIRE_JUDICIAIRE,
                      checked: formData.mesureProtection === MESURE_PROTECTION.MANDATAIRE_JUDICIAIRE,
                      onChange: () => handleMesureProtectionChange(MESURE_PROTECTION.MANDATAIRE_JUDICIAIRE),
                    },
                  },
                  {
                    label: 'Mandataire familial',
                    nativeInputProps: {
                      value: MESURE_PROTECTION.MANDATAIRE_FAMILIAL,
                      checked: formData.mesureProtection === MESURE_PROTECTION.MANDATAIRE_FAMILIAL,
                      onChange: () => handleMesureProtectionChange(MESURE_PROTECTION.MANDATAIRE_FAMILIAL),
                    },
                  },
                  {
                    label: 'Non',
                    nativeInputProps: {
                      value: MESURE_PROTECTION.NON,
                      checked: formData.mesureProtection === MESURE_PROTECTION.NON,
                      onChange: () => handleMesureProtectionChange(MESURE_PROTECTION.NON),
                    },
                  },
                  buildNonRenseigneOption(
                    formData.mesureProtection === MESURE_PROTECTION.NON_RENSEIGNE,
                    () => handleMesureProtectionChange(MESURE_PROTECTION.NON_RENSEIGNE),
                    'mesure de protection',
                  ),
                ]}
              />
            </div>

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.estHandicapee.label}
                name="personne-concernee-est-handicapee"
                orientation="horizontal"
                options={buildOuiNonOptions(
                  formData.estHandicapee,
                  (value) => handleReponseChange('estHandicapee', value),
                  'situation de handicap',
                )}
              />
            </div>

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.aAutrePersonnes.label}
                name="personne-concernee-a-autre-personnes"
                orientation="horizontal"
                options={buildOuiNonOptions(
                  formData.aAutrePersonnes,
                  (value) => handleReponseChange('aAutrePersonnes', value),
                  'autres personnes concernées',
                )}
              />
            </div>

            <div aria-live="polite">
              {formData.aAutrePersonnes === REPONSE_OUI_NON.OUI ? (
                <Input
                  label={personneConcerneeFieldMetadata.autrePersonnes.label}
                  hintText="Nom, prénom, lien avec la personne concernée, etc."
                  textArea
                  nativeTextAreaProps={{
                    value: formData.autrePersonnes || '',
                    onChange: handleInputChange('autrePersonnes'),
                    rows: 3,
                  }}
                />
              ) : null}
            </div>

            <Input
              label={personneConcerneeFieldMetadata.commentaire.label}
              textArea
              nativeTextAreaProps={{
                value: formData.commentaire || '',
                onChange: handleInputChange('commentaire'),
                rows: 4,
              }}
            />
          </fieldset>
        </div>

        <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
          <Button priority="secondary" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
