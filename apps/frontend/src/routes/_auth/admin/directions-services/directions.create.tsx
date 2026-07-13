import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';

const requireEntityAdmin = requireAuthAndRoles([ROLES.ENTITY_ADMIN]);

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
  useEffect(() => {
    document.title = 'Créer une direction - Directions et services - SIRENA';
  }, []);

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
        <form>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <fieldset className="fr-fieldset fr-mb-3w">
            <legend className="fr-fieldset__legend">Informations utilisées dans SIRENA</legend>

            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-7">
                <Input
                  className="fr-fieldset__content"
                  label="Nom de la direction (obligatoire)"
                  hintText="Nom complet sans abréviation ou acronyme. Exemple : Direction de l’Offre de Soins"
                  nativeInputProps={{ name: 'nomComplet' }}
                />
              </div>

              <div className="fr-col-12 fr-col-md-5">
                <Input
                  className="fr-fieldset__content"
                  label="Abréviation (obligatoire)"
                  hintText="Sigle, acronyme ou forme abrégée du nom. Exemple : DOS"
                  nativeInputProps={{ name: 'label' }}
                />
              </div>

              <div className="fr-col-12 fr-col-md-7">
                <Input
                  className="fr-fieldset__content"
                  label="Adresse e-mail de notification"
                  hintText="Adresse générique pour la notification des nouvelles requêtes. Exemple : reclamations@direction.fr"
                  nativeInputProps={{ name: 'email' }}
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
                  nativeInputProps={{ name: 'emailContactUsager' }}
                />
              </div>

              <div className="fr-col-12 fr-col-md-5">
                <Input
                  className="fr-fieldset__content"
                  label="Numéro de téléphone"
                  hintText="Format attendu : 10 chiffres ou +31XXXXXXXXXX (international)"
                  nativeInputProps={{ name: 'telContactUsager', type: 'tel' }}
                />
              </div>

              <div className="fr-col-12">
                <Input
                  className="fr-fieldset__content"
                  label="Adresse postale"
                  hintText="Adresse postale complète : service, numéro et libellé de voie, code postal, ville. Exemple : Sous-direction de l’autonomie, Direction des Solidarités (DSOL), 5 bd Diderot, 75012 Paris."
                  textArea
                  nativeTextAreaProps={{ name: 'adresseContactUsager', rows: 4 }}
                />
              </div>
            </div>
          </fieldset>

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/directions-services">
              Annuler
            </Link>
            <Button type="submit">Ajouter la direction</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
