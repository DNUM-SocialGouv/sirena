import { Button } from '@codegouvfr/react-dsfr/Button';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
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

  const handleCheckboxChange = (field: keyof PersonneConcerneeData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: PersonneConcerneeData) => ({ ...prev, [field]: e.target.checked }));
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
          <h2 className="fr-h6 fr-mb-3w">Identité</h2>
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

          <div className="fr-grid-row fr-grid-row--gutters">
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
          </div>
        </div>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <h2 className="fr-h6 fr-mb-3w">Informations de contact</h2>
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
        </div>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <h2 className="fr-h6 fr-mb-3w">Informations complémentaires</h2>

          <div className="fr-mb-3w">
            <Checkbox
              options={[
                {
                  label: personneConcerneeFieldMetadata.estHandicapee.label,
                  nativeInputProps: {
                    checked: formData.estHandicapee || false,
                    onChange: handleCheckboxChange('estHandicapee'),
                  },
                },
              ]}
            />
          </div>

          <div className="fr-mb-3w">
            <Checkbox
              options={[
                {
                  label: personneConcerneeFieldMetadata.veutGarderAnonymat.label,
                  nativeInputProps: {
                    checked: formData.veutGarderAnonymat || false,
                    onChange: handleCheckboxChange('veutGarderAnonymat'),
                  },
                },
              ]}
            />
          </div>

          <div className="fr-mb-3w">
            <Checkbox
              options={[
                {
                  label: personneConcerneeFieldMetadata.estVictimeInformee.label,
                  nativeInputProps: {
                    checked: formData.estVictimeInformee || false,
                    onChange: handleCheckboxChange('estVictimeInformee'),
                  },
                },
              ]}
            />
          </div>

          <div className="fr-mb-3w">
            <Checkbox
              options={[
                {
                  label: personneConcerneeFieldMetadata.aAutrePersonnes.label,
                  nativeInputProps: {
                    checked: formData.aAutrePersonnes || false,
                    onChange: handleCheckboxChange('aAutrePersonnes'),
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

          <Input
            label={personneConcerneeFieldMetadata.commentaire.label}
            textArea
            nativeTextAreaProps={{
              value: formData.commentaire || '',
              onChange: handleInputChange('commentaire'),
              rows: 4,
            }}
          />
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
