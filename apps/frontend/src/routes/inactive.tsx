import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { createFileRoute } from '@tanstack/react-router';
import { NotAuth } from '@/components/layout/notAuth/layout';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { queryClient } from '@/lib/queryClient';

export const Route = createFileRoute('/inactive')({
  head: () => ({
    meta: [
      {
        title: 'Compte inactif - SIRENA',
      },
    ],
  }),
  beforeLoad: async () => queryClient.ensureQueryData(profileQueryOptions()),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <NotAuth>
      <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-container fr-px-md-0  fr-py-md-14v">
            <Alert
              severity="info"
              title="Compte inactif"
              description="Votre compte SIRENA a bien été créé. Veuillez contacter votre administrateur pour qu'il vous attribue les droits nécessaires à l'utilisation de l'application."
            />
          </div>
        </div>
      </div>
    </NotAuth>
  );
}
