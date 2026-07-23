import { Loader } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import './entite.css';

export const Route = createFileRoute('/_auth/admin/entite/')({
  component: RouteComponent,
});

const displayOptionalValue = (value: string) => value.trim() || 'Non renseigné';

export function RouteComponent() {
  const entiteQuery = useEntiteAdministrativeAdminLocal();

  useEffect(() => {
    document.title = 'Informations de l’entité - Espace administrateur - SIRENA';
  }, []);

  return (
    <section>
      <div className="assigned-entite-details__header">
        <h2>Informations de l’entité</h2>
        {entiteQuery.data ? (
          <Link className="fr-btn fr-btn--secondary" to="/admin/entite/edit">
            Modifier les informations
          </Link>
        ) : null}
      </div>

      {entiteQuery.isPending ? <Loader /> : null}
      {entiteQuery.isError ? <QueryErrorState message="Erreur lors du chargement de l’entité." /> : null}

      {entiteQuery.data ? (
        <div className="assigned-entite-details">
          <section>
            <h3 className="assigned-entite-details__section-title">Informations utilisées dans SIRENA</h3>
            <dl className="assigned-entite-details__grid">
              <div>
                <dt>Nom</dt>
                <dd>{entiteQuery.data.nomComplet}</dd>
              </div>
              <div>
                <dt>Abréviation</dt>
                <dd>{entiteQuery.data.label}</dd>
              </div>
              <div>
                <dt>Adresse e-mail de notification</dt>
                <dd>{displayOptionalValue(entiteQuery.data.email)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="assigned-entite-details__section-title">Informations de contact pour l’usager</h3>
            <dl className="assigned-entite-details__grid">
              <div>
                <dt>Adresse e-mail de contact</dt>
                <dd>{displayOptionalValue(entiteQuery.data.emailContactUsager)}</dd>
              </div>
              <div>
                <dt>Numéro de téléphone</dt>
                <dd>{displayOptionalValue(entiteQuery.data.telContactUsager)}</dd>
              </div>
              <div className="assigned-entite-details__full-width">
                <dt>Adresse postale</dt>
                <dd>{displayOptionalValue(entiteQuery.data.adresseContactUsager)}</dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
    </section>
  );
}
