import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { ROLES } from '@sirena/common/constants';
import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useCreateChildEntiteAdmin, useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';
import { getCreateEntiteTitle } from './-helpers';

const CreateChildEntiteFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le champ "Nom - libellé long" est vide. Veuillez le renseigner.'),
  label: z.string().trim().min(1, 'Le champ "Nom court" est vide. Veuillez le renseigner.'),
  email: optionalEmailSchema,
  emailContactUsager: optionalEmailSchema,
  adresseContactUsager: z.string().trim(),
  telContactUsager: optionalPhoneSchema,
  isActive: z.enum(['oui', 'non'], 'Le statut actif dans SIRENA est obligatoire. Veuillez sélectionner une option.'),
});

export const Route = createFileRoute('/_auth/admin/entites/$entiteId/create')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const router = useRouter();
  const { entiteId } = (Route.useParams as () => { entiteId: string })();
  const toastManager = Toast.useToastManager();
  const createEntiteAdminChild = useCreateChildEntiteAdmin();
  const isSubmittingRef = useRef(false);
  const entiteQuery = useEntiteByIdAdmin(entiteId);
  const entiteChainQuery = useEntiteChain(entiteId);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const entiteDepth = entiteChainQuery.data?.length ?? 0;

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    nomComplet: '',
    label: '',
    email: '',
    emailContactUsager: '',
    adresseContactUsager: '',
    telContactUsager: '',
    isActive: '',
  });

  useEffect(() => {
    document.title = `${getCreateEntiteTitle(entiteDepth)}`;
  }, [entiteDepth]);

  useEffect(() => {
    if (entiteDepth >= 3) {
      router.navigate({
        to: '/admin/entites/$entiteId',
        params: { entiteId },
      });
    }
  }, [entiteDepth, entiteId, router]);

  if (entiteQuery.isPending || entiteChainQuery.isPending) {
    return null;
  }

  if (entiteQuery.isError || !entiteQuery.data || entiteChainQuery.isError || !entiteChainQuery.data) {
    return null;
  }

  const title = entiteDepth === 1 ? 'Créer une direction' : 'Créer un service';

  if (entiteDepth >= 3) {
    return null;
  }

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;

      setFormData((prev) => {
        const updatedData = {
          ...prev,
          [field]: value,
        };

        if (hasSubmitted && validationErrors[field]) {
          const fieldError = getFieldError(CreateChildEntiteFormSchema, updatedData, field);

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

    if (isSubmittingRef.current || createEntiteAdminChild.isPending) return;

    setHasSubmitted(true);

    const result = CreateChildEntiteFormSchema.safeParse(formData);

    if (!result.success) {
      const errors = zodIssuesToFieldErrors(result.error);
      setValidationErrors(errors);

      const firstField = Object.keys(errors)[0];

      const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
      el?.focus();

      return;
    }

    setValidationErrors({});
    isSubmittingRef.current = true;

    try {
      const createdEntite = await createEntiteAdminChild.mutateAsync({
        id: entiteId,
        input: {
          ...result.data,
          email: result.data.email ?? '',
          emailContactUsager: result.data.emailContactUsager ?? '',
          telContactUsager: result.data.telContactUsager ?? '',
          isActive: result.data.isActive === 'oui',
        },
      });

      toastManager.add({
        title: 'Entité créée avec succès',
        description: 'La nouvelle entité a bien été enregistrée.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });

      await router.navigate({
        to: '/admin/entites/$entiteId',
        params: { entiteId: createdEntite.id },
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fr-container fr-mt-4w">
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/entites/$entiteId" params={{ entiteId }}>
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Modifier l’entité
        </Link>
      </div>

      <h2 className="fr-mb-4w">{title}</h2>

      <div className="fr-card fr-p-3w fr-mb-4w">
        <p className="fr-text--sm fr-text-mention--grey fr-mb-1w">Entité mère</p>
        <p className="fr-mb-0">{entiteQuery.data.nomComplet}</p>
      </div>

      <div className="fr-card fr-p-3w fr-mb-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w fr-ml-1w">Sauf mention contraire, les champs sont facultatifs.</p>

          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Informations de la nouvelle entité</legend>

            <Input
              className="fr-fieldset__content"
              label="Nom - libellé long (obligatoire)"
              state={validationErrors.nomComplet ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.nomComplet}
              nativeInputProps={{
                name: 'nomComplet',
                value: formData.nomComplet,
                onChange: handleInputChange('nomComplet'),
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Nom court (obligatoire)"
              state={validationErrors.label ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.label}
              nativeInputProps={{
                name: 'label',
                value: formData.label,
                onChange: handleInputChange('label'),
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Adresse électronique de notification"
              hintText="Boîte e-mail générique pour la notification des nouvelles requêtes. Exemple : prenom.nom@exemple.com"
              state={validationErrors.email ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.email}
              nativeInputProps={{
                name: 'email',
                value: formData.email,
                onChange: handleInputChange('email'),
              }}
            />
          </fieldset>

          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Éléments de contact pour l’usager</legend>

            <Input
              className="fr-fieldset__content"
              label="Adresse électronique"
              hintText="Exemple : prenom.nom@exemple.com"
              state={validationErrors.emailContactUsager ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.emailContactUsager}
              nativeInputProps={{
                name: 'emailContactUsager',
                value: formData.emailContactUsager,
                onChange: handleInputChange('emailContactUsager'),
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Adresse postale"
              hintText="Adresse postale complète pour l’usager : service, numéro et libellé de voie, code postal, ville. Exemple : Sous-direction de l’autonomie, Direction des Solidarités (DSOL), 5 bd
 Diderot, 75012 Paris."
              textArea
              nativeTextAreaProps={{
                name: 'adresseContactUsager',
                rows: 4,
                value: formData.adresseContactUsager,
                onChange: handleInputChange('adresseContactUsager'),
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Numéro de téléphone"
              hintText="Format attendu : 10 chiffres (français) ou +33XXXXXXXXXX (international)"
              state={validationErrors.telContactUsager ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.telContactUsager}
              nativeInputProps={{
                name: 'telContactUsager',
                type: 'tel',
                value: formData.telContactUsager,
                onChange: handleInputChange('telContactUsager'),
              }}
            />
          </fieldset>

          <fieldset className="fr-fieldset">
            <Select
              className="fr-fieldset__content"
              label="Actif dans SIRENA (obligatoire)"
              state={validationErrors.isActive ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.isActive}
              nativeSelectProps={{
                name: 'isActive',
                value: formData.isActive,
                onChange: handleInputChange('isActive'),
              }}
            >
              <option value="" disabled>
                Sélectionnez une option
              </option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </Select>
          </fieldset>

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Button type="submit" disabled={createEntiteAdminChild.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
