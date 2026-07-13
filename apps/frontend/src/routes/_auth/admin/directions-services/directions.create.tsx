import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { useCreateDirectionAdminLocal } from '@/hooks/queries/entites.hook';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';

const requireEntityAdmin = requireAuthAndRoles([ROLES.ENTITY_ADMIN]);

const CreateDirectionFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le champ "Nom de la direction" est vide. Veuillez le renseigner.'),
  label: z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
  email: optionalEmailSchema,
  emailContactUsager: optionalEmailSchema,
  telContactUsager: optionalPhoneSchema,
  adresseContactUsager: z.string(),
});

export const Route = createFileRoute('/_auth/admin/directions-services/directions/create')({
  beforeLoad: async (ctx) => {
    requireEntityAdmin(ctx);
    const flags = await queryClient.ensureQueryData({
      queryKey: ['featureFlags', 'resolved'],
      queryFn: fetchResolvedFeatureFlags,
    });

    if (!flags[FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]) {
      throw redirect({ to: '/admin/users' });
    }
  },
  component: RouteComponent,
});

export function RouteComponent() {
  const [formData, setFormData] = useState({
    nomComplet: '',
    label: '',
    email: '',
    emailContactUsager: '',
    telContactUsager: '',
    adresseContactUsager: '',
  });
  const createDirectionAdminLocal = useCreateDirectionAdminLocal();
  const toastManager = Toast.useToastManager();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Créer une direction - Directions et services - SIRENA';
  }, []);

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;

      setFormData((prev) => {
        const updatedData = { ...prev, [field]: value };

        if (hasSubmitted && validationErrors[field]) {
          const fieldError = getFieldError(CreateDirectionFormSchema, updatedData, field);

          setValidationErrors((prevErrors) => {
            const next = { ...prevErrors };

            if (fieldError) {
              next[field] = fieldError;
            } else {
              delete next[field];
            }

            return next;
          });
        }

        return updatedData;
      });
    };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasSubmitted(true);

    const result = CreateDirectionFormSchema.safeParse(formData);

    if (!result.success) {
      const errors = zodIssuesToFieldErrors(result.error);
      setValidationErrors(errors);

      const firstField = Object.keys(errors)[0];
      document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    setValidationErrors({});

    await createDirectionAdminLocal.mutateAsync({
      nomComplet: result.data.nomComplet,
      label: result.data.label,
      email: result.data.email ?? '',
      emailContactUsager: result.data.emailContactUsager ?? '',
      telContactUsager: result.data.telContactUsager ?? '',
      adresseContactUsager: result.data.adresseContactUsager,
      isActive: true,
    });

    toastManager.add({
      title: 'Direction créée avec succès',
      description: 'La nouvelle direction a bien été enregistrée.',
      timeout: 0,
      data: { icon: 'fr-alert--success' },
    });
  };

  return (
    <section>
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/directions-services">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Directions et services
        </Link>
      </div>

      <h2>Créer une direction</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <fieldset className="fr-fieldset fr-mb-3w">
            <legend className="fr-fieldset__legend">Informations utilisées dans SIRENA</legend>

            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-7">
                <Input
                  className="fr-fieldset__content"
                  label="Nom de la direction (obligatoire)"
                  hintText="Nom complet sans abréviation ou acronyme. Exemple : Direction de l’Offre de Soins"
                  state={validationErrors.nomComplet ? 'error' : 'default'}
                  stateRelatedMessage={validationErrors.nomComplet}
                  nativeInputProps={{
                    name: 'nomComplet',
                    value: formData.nomComplet,
                    onChange: handleInputChange('nomComplet'),
                  }}
                />
              </div>

              <div className="fr-col-12 fr-col-md-5">
                <Input
                  className="fr-fieldset__content"
                  label="Abréviation (obligatoire)"
                  hintText="Sigle, acronyme ou forme abrégée du nom. Exemple : DOS"
                  state={validationErrors.label ? 'error' : 'default'}
                  stateRelatedMessage={validationErrors.label}
                  nativeInputProps={{ name: 'label', value: formData.label, onChange: handleInputChange('label') }}
                />
              </div>

              <div className="fr-col-12 fr-col-md-7">
                <Input
                  className="fr-fieldset__content"
                  label="Adresse e-mail de notification"
                  hintText="Adresse générique pour la notification des nouvelles requêtes. Exemple : reclamations@direction.fr"
                  state={validationErrors.email ? 'error' : 'default'}
                  stateRelatedMessage={validationErrors.email}
                  nativeInputProps={{ name: 'email', value: formData.email, onChange: handleInputChange('email') }}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend fr-mb-3w fr-pb-0">Informations de contact pour l’usager</legend>

            <div className="fr-pl-1w fr-mb-3w">
              <Alert
                severity="info"
                small
                description="Si vous ne renseignez pas ces informations, l’adresse e-mail de notification sera transmise au déclarant, dans l’accusé de réception, afin qu’il puisse vous contacter."
              />
            </div>

            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-7">
                <Input
                  className="fr-fieldset__content"
                  label="Adresse e-mail de contact"
                  hintText="Adresse transmise à l’usager pour vous contacter. Exemple : contact@direction.fr"
                  state={validationErrors.emailContactUsager ? 'error' : 'default'}
                  stateRelatedMessage={validationErrors.emailContactUsager}
                  nativeInputProps={{
                    name: 'emailContactUsager',
                    value: formData.emailContactUsager,
                    onChange: handleInputChange('emailContactUsager'),
                  }}
                />
              </div>

              <div className="fr-col-12 fr-col-md-5">
                <Input
                  className="fr-fieldset__content"
                  label="Numéro de téléphone"
                  hintText="Format attendu : 10 chiffres ou +33XXXXXXXXXX (international)"
                  state={validationErrors.telContactUsager ? 'error' : 'default'}
                  stateRelatedMessage={validationErrors.telContactUsager}
                  nativeInputProps={{
                    name: 'telContactUsager',
                    type: 'tel',
                    value: formData.telContactUsager,
                    onChange: handleInputChange('telContactUsager'),
                  }}
                />
              </div>

              <div className="fr-col-12">
                <Input
                  className="fr-fieldset__content"
                  label="Adresse postale"
                  hintText="Adresse postale complète : service, numéro et libellé de voie, code postal, ville. Exemple : Sous-direction de l’autonomie, Direction des Solidarités (DSOL), 5 bd Diderot, 75012 Paris."
                  textArea
                  nativeTextAreaProps={{
                    name: 'adresseContactUsager',
                    rows: 4,
                    value: formData.adresseContactUsager,
                    onChange: handleInputChange('adresseContactUsager'),
                  }}
                />
              </div>
            </div>
          </fieldset>

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/directions-services">
              Annuler
            </Link>
            <Button type="submit" disabled={createDirectionAdminLocal.isPending}>
              Ajouter la direction
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
