import Button from '@codegouvfr/react-dsfr/Button';
import Select from '@codegouvfr/react-dsfr/Select';
import { Loader } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
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
  const title = `Modifier ${target.kind === 'direction' ? 'la' : 'le'} ${entityLabel} ${target.nomComplet}`;
  const [formData, setFormData] = useState({
    nomComplet: target.nomComplet,
    label: target.label,
    email: target.email,
    isActive: target.isActive ? 'oui' : 'non',
  });

  useEffect(() => {
    document.title = `${title} - Directions et services - SIRENA`;
  }, [title]);

  const handleChange =
    (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData((previous) => ({ ...previous, [field]: event.target.value }));
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
        <form onSubmit={(event) => event.preventDefault()}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalDirectionServiceSirenaFields
            kind={target.kind}
            formData={formData}
            validationErrors={{}}
            onChange={handleChange}
          />

          <fieldset className="fr-fieldset">
            <Select
              className="fr-fieldset__content"
              label="Actif dans SIRENA (obligatoire)"
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
            <Button type="submit" disabled>
              Valider les modifications
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
