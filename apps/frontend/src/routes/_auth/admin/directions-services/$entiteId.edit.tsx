import Button from '@codegouvfr/react-dsfr/Button';
import Select from '@codegouvfr/react-dsfr/Select';
import { optionalEmailSchema } from '@sirena/common/schemas';
import { Loader, Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useDirectionServiceAdminLocal, useEditDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';
import { LocalDirectionServiceSirenaFields } from './-components/LocalDirectionServiceSirenaFields';
import { requireAdminLocalDirectionsServices } from './-route-guard';

export const Route = createFileRoute('/_auth/admin/directions-services/$entiteId/edit')({
  beforeLoad: requireAdminLocalDirectionsServices,
  component: RouteComponent,
});

export function RouteComponent() {
  const { entiteId } = (Route.useParams as () => { entiteId: string })();
  const entiteQuery = useDirectionServiceAdminLocal(entiteId);

  if (entiteQuery.isPending) {
    return <Loader />;
  }

  if (entiteQuery.isError || !entiteQuery.data) {
    return <QueryErrorState message="Erreur lors du chargement de la direction ou du service." />;
  }

  return <LocalEditForm target={entiteQuery.data} />;
}

type LocalEditTarget = NonNullable<ReturnType<typeof useDirectionServiceAdminLocal>['data']>;

function LocalEditForm({ target }: { target: LocalEditTarget }) {
  const entityLabel = target.kind === 'direction' ? 'direction' : 'service';
  const entityArticle = target.kind === 'direction' ? 'la' : 'le';
  const title = `Modifier ${entityArticle} ${entityLabel} ${target.nomComplet}`;
  const editDirectionService = useEditDirectionServiceAdminLocal();
  const toastManager = Toast.useToastManager();
  const router = useRouter();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nomComplet: target.nomComplet,
    label: target.label,
    email: target.email,
    isActive: target.isActive ? 'oui' : 'non',
  });
  const formSchema = z.object({
    nomComplet: z
      .string()
      .trim()
      .min(
        1,
        `Le champ "Nom ${target.kind === 'direction' ? 'de la direction' : 'du service'}" est vide. Veuillez le renseigner.`,
      ),
    label: z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
    email: optionalEmailSchema,
    isActive: z.enum(['oui', 'non']),
  });

  useEffect(() => {
    document.title = `${title} - Directions et services - SIRENA`;
  }, [title]);

  const handleChange =
    (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormData((previous) => {
        const updated = { ...previous, [field]: value };

        if (hasSubmitted && validationErrors[field]) {
          const fieldError = getFieldError(formSchema, updated, field);
          setValidationErrors((previousErrors) => {
            const next = { ...previousErrors };
            if (fieldError) next[field] = fieldError;
            else delete next[field];
            return next;
          });
        }

        return updated;
      });
    };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    const result = formSchema.safeParse(formData);

    if (!result.success) {
      const errors = zodIssuesToFieldErrors(result.error);
      setValidationErrors(errors);
      const firstField = Object.keys(errors)[0];
      document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    setValidationErrors({});

    try {
      await editDirectionService.mutateAsync({
        id: target.id,
        input: {
          nomComplet: result.data.nomComplet,
          label: result.data.label,
          email: result.data.email ?? '',
          isActive: result.data.isActive === 'oui',
        },
      });
      const capitalizedEntityLabel = entityLabel[0].toUpperCase() + entityLabel.slice(1);
      toastManager.add({
        title: `${capitalizedEntityLabel} ${target.kind === 'direction' ? 'modifiée' : 'modifié'} avec succès`,
        description: 'Les modifications ont bien été enregistrées.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
      await router.navigate({ to: '/admin/directions-services' });
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: `Erreur lors de la modification ${target.kind === 'direction' ? 'de la direction' : 'du service'}. Veuillez réessayer.`,
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      });
    }
  };

  return (
    <section>
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/directions-services">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Directions et services
        </Link>
      </div>

      <h2>{title}</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalDirectionServiceSirenaFields
            kind={target.kind}
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleChange}
          />

          <fieldset className="fr-fieldset">
            <Select
              className="fr-fieldset__content"
              label="Actif dans SIRENA (obligatoire)"
              state={validationErrors.isActive ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.isActive}
              nativeSelectProps={{ name: 'isActive', value: formData.isActive, onChange: handleChange('isActive') }}
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </Select>
          </fieldset>

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/directions-services">
              Annuler
            </Link>
            <Button type="submit" disabled={editDirectionService.isPending}>
              Valider les modifications
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
