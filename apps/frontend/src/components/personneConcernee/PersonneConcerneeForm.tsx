import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { mappers } from '@sirena/common';
import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { personneConcerneeFieldMetadata } from '@/lib/fieldMetadata';
import type { PersonneConcerneeData } from '@/lib/personneConcernee';

interface PersonneConcerneeFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  initialData?: PersonneConcerneeData;
  onSave: (data: PersonneConcerneeData, shouldCreateRequest: boolean) => Promise<void>;
}

export function PersonneConcerneeForm({ mode, requestId, initialData, onSave }: PersonneConcerneeFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PersonneConcerneeData>(initialData || {});
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

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

  const handleBooleanChange = (field: keyof PersonneConcerneeData, value: boolean) => {
    setFormData((prev: PersonneConcerneeData) => {
      if (field === 'estVictimeInformee' && value) {
        return { ...prev, [field]: value, victimeInformeeCommentaire: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);

    let hasErrors = false;

    if (formData.courrierElectronique) {
      try {
        optionalEmailSchema.parse(formData.courrierElectronique);
        setEmailError(undefined);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setEmailError(error.issues[0].message);
          hasErrors = true;
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
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
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
  };

  const handleCancel = () => {
    if (mode === 'create' && !requestId) {
      navigate({ to: '/request/create' });
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
                  nativeInputProps={{
                    type: 'date',
                    max: new Date().toISOString().split('T')[0],
                    value: formData.dateNaissance || '',
                    onChange: (e) => {
                      const value = e.target.value;
                      setFormData((prev: PersonneConcerneeData) => ({ ...prev, dateNaissance: value || undefined }));
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
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label={personneConcerneeFieldMetadata.adresseDomicile.label}
                  nativeInputProps={{
                    value: formData.adresseDomicile || '',
                    onChange: handleInputChange('adresseDomicile'),
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-2">
                <Input
                  label={personneConcerneeFieldMetadata.codePostal.label}
                  nativeInputProps={{
                    value: formData.codePostal || '',
                    onChange: handleInputChange('codePostal'),
                    maxLength: 5,
                  }}
                />
              </div>
              <div className="fr-col-12 fr-col-md-4">
                <Input
                  label={personneConcerneeFieldMetadata.ville.label}
                  nativeInputProps={{
                    value: formData.ville || '',
                    onChange: handleInputChange('ville'),
                  }}
                />
              </div>
            </div>
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label={personneConcerneeFieldMetadata.numeroTelephone.label}
                  hintText="Format attendu : 10 chiffres (français) ou +33XXXXXXXXXX (international)"
                  state={phoneError ? 'error' : undefined}
                  stateRelatedMessage={phoneError}
                  nativeInputProps={{
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
                options={[
                  {
                    label: 'Oui',
                    nativeInputProps: {
                      value: 'true',
                      checked: formData.consentCommuniquerIdentite === true,
                      onChange: () => handleBooleanChange('consentCommuniquerIdentite', true),
                    },
                  },
                  {
                    label: 'Non',
                    nativeInputProps: {
                      value: 'false',
                      checked: formData.consentCommuniquerIdentite === false,
                      onChange: () => handleBooleanChange('consentCommuniquerIdentite', false),
                    },
                  },
                ]}
              />
            </div>

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.estVictimeInformee.label}
                name="personne-concernee-est-victime-informee"
                orientation="horizontal"
                options={[
                  {
                    label: 'Oui',
                    nativeInputProps: {
                      value: 'true',
                      checked: formData.estVictimeInformee === true,
                      onChange: () => handleBooleanChange('estVictimeInformee', true),
                    },
                  },
                  {
                    label: 'Non',
                    nativeInputProps: {
                      value: 'false',
                      checked: formData.estVictimeInformee === false,
                      onChange: () => handleBooleanChange('estVictimeInformee', false),
                    },
                  },
                ]}
              />
            </div>
            {formData.estVictimeInformee === false && (
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

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.aAutrePersonnes.label}
                name="personne-concernee-a-autre-personnes"
                orientation="horizontal"
                options={[
                  {
                    label: 'Oui',
                    nativeInputProps: {
                      value: 'true',
                      checked: formData.aAutrePersonnes === true,
                      onChange: () => handleBooleanChange('aAutrePersonnes', true),
                    },
                  },
                  {
                    label: 'Non',
                    nativeInputProps: {
                      value: 'false',
                      checked: formData.aAutrePersonnes === false,
                      onChange: () => handleBooleanChange('aAutrePersonnes', false),
                    },
                  },
                ]}
              />
            </div>

            {formData.aAutrePersonnes && (
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
            )}

            <div className="fr-mb-3w">
              <RadioButtons
                legend={personneConcerneeFieldMetadata.estHandicapee.label}
                name="personne-concernee-est-handicapee"
                orientation="horizontal"
                options={[
                  {
                    label: 'Oui',
                    nativeInputProps: {
                      value: 'true',
                      checked: formData.estHandicapee === true,
                      onChange: () => handleBooleanChange('estHandicapee', true),
                    },
                  },
                  {
                    label: 'Non',
                    nativeInputProps: {
                      value: 'false',
                      checked: formData.estHandicapee === false,
                      onChange: () => handleBooleanChange('estHandicapee', false),
                    },
                  },
                ]}
              />
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
