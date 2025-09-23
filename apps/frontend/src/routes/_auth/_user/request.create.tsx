import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Création requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="fr-container fr-mt-4w">
      <h1>Création d'une nouvelle requête</h1>

      <div className="fr-grid-row fr-grid-row--gutters fr-mt-5w">
        <div className="fr-col-12">
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Déclarant</h2>
              <p className="fr-card__desc">Les informations du déclarant seront ajoutées ultérieurement</p>
            </div>
          </div>
        </div>

        <div className="fr-col-12">
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Personne concernée</h2>
              <p className="fr-card__desc">Les informations de la personne concernée seront ajoutées ultérieurement</p>
            </div>
          </div>
        </div>

        <div className="fr-col-12">
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Faits</h2>
              <p className="fr-card__desc">Les faits seront ajoutés ultérieurement</p>
            </div>
          </div>
        </div>

        <div className="fr-col-12">
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Requête originale</h2>
              <p className="fr-card__desc">Les informations de la requête originale seront ajoutées ultérieurement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fr-notice fr-notice--info fr-mt-3w">
        <div className="fr-container">
          <div className="fr-notice__body">
            <p className="fr-notice__title">
              La requête sera créée automatiquement dès qu'un champ sera renseigné dans l'une des sections ci-dessus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
