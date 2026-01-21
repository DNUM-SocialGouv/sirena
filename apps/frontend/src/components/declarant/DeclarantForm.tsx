import { Button } from '@codegouvfr/react-dsfr/Button';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { mappers } from '@sirena/common';
import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import type { DeclarantData } from '@/lib/declarant';
import { declarantFieldMetadata } from '@/lib/fieldMetadata';

interface DeclarantFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  initialData?: DeclarantData;
  onSave: (data: DeclarantData, shouldCreateRequest: boolean) => Promise<void>;
}

export function DeclarantForm({ mode, requestId, initialData, onSave }: DeclarantFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DeclarantData>(initialData || {});
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  const handleInputChange =
    (field: keyof DeclarantData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData((prev: DeclarantData) => ({ ...prev, [field]: value }));

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

  const handleCheckboxChange = (field: keyof DeclarantData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: DeclarantData) => ({ ...prev, [field]: e.target.checked }));
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

        <h1 className="fr-mb-2w">Déclarant</h1>
        <p className="fr-text--sm fr-mb-5w">Tous les champs sont facultatifs</p>

        <div
          className="fr-p-4w fr-mb-4w"
          style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
        >
          <h2 className="fr-h6 fr-mb-3w">Identité</h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-3">
              <Select
                label={declarantFieldMetadata.civilite.label}
                nativeSelectProps={{
                  value: formData.civilite ?? '',
                  onChange: (e) => {
                    const value = e.target.value;
                    setFormData((prev: DeclarantData) => ({ ...prev, civilite: value || undefined }));
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
                label={declarantFieldMetadata.nom.label}
                nativeInputProps={{
                  value: formData.nom || '',
                  onChange: handleInputChange('nom'),
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-5">
              <Input
                label={declarantFieldMetadata.prenom.label}
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
                label={declarantFieldMetadata.lienAvecPersonneConcernee.label}
                nativeSelectProps={{
                  value: formData.lienAvecPersonneConcernee ?? '',
                  onChange: (e) => {
                    const value = e.target.value;
                    setFormData((prev: DeclarantData) => ({
                      ...prev,
                      lienAvecPersonneConcernee: value || undefined,
                    }));
                  },
                }}
              >
                <option value="">Sélectionner une option</option>
                {mappers.lienAvecPersonneConcerneeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            {formData.lienAvecPersonneConcernee === 'AUTRE' && (
              <div className="fr-col-12 fr-col-md-6">
                <Input
                  label={declarantFieldMetadata.lienAvecPersonneConcerneePrecision.label}
                  nativeInputProps={{
                    value: formData.lienAvecPersonneConcerneePrecision || '',
                    onChange: handleInputChange('lienAvecPersonneConcerneePrecision'),
                    placeholder: 'Précisez votre lien avec la personne concernée',
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
          <h2 className="fr-h6 fr-mb-3w">Informations de contact</h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-6">
              <Input
                label={declarantFieldMetadata.adresseDomicile.label}
                nativeInputProps={{
                  value: formData.adresseDomicile || '',
                  onChange: handleInputChange('adresseDomicile'),
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-2">
              <Input
                label={declarantFieldMetadata.codePostal.label}
                nativeInputProps={{
                  value: formData.codePostal || '',
                  onChange: handleInputChange('codePostal'),
                  maxLength: 5,
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-4">
              <Input
                label={declarantFieldMetadata.ville.label}
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
                label={declarantFieldMetadata.numeroTelephone.label}
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
                label={declarantFieldMetadata.courrierElectronique.label}
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

          <Checkbox
            options={[
              {
                label: declarantFieldMetadata.neSouhaitePasCommuniquerIdentite.label,
                nativeInputProps: {
                  checked: formData.neSouhaitePasCommuniquerIdentite || false,
                  onChange: handleCheckboxChange('neSouhaitePasCommuniquerIdentite'),
                },
              },
              {
                label: declarantFieldMetadata.estSignalementProfessionnel.label,
                nativeInputProps: {
                  checked: formData.estSignalementProfessionnel || false,
                  onChange: handleCheckboxChange('estSignalementProfessionnel'),
                },
              },
            ]}
          />

          <Input
            label={declarantFieldMetadata.autresPrecisions.label}
            textArea
            nativeTextAreaProps={{
              value: formData.autresPrecisions || '',
              onChange: handleInputChange('autresPrecisions'),
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
