import { NotLoggedLayout } from '@/components/layout/notLogged';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
// dette technique : voir comment décommissionner quand on aura une vraie maquette de la page d'accueil
const fallback = '/home' as const;

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'Page de connexion - SIRENA',
      },
    ],
  }),

  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
    state: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.userStore.isLogged) {
      throw redirect({ to: search.redirect || fallback });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  // TODO handle errors

  return (
    <NotLoggedLayout>
      <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-container fr-background-alt--grey fr-px-md-0 fr-py-10v fr-py-md-14v">
            <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
              <div className="fr-col-12 fr-col-md-9 fr-col-lg-8">
                <h1>Connexion à SIRENA</h1>
                <div className="fr-mb-6v">
                  <h2>Se connecter avec ProConnect</h2>
                  <div className="fr-connect-group">
                    <form action="/api/auth/login" method="post">
                      <button className="fr-btn fr-connect pro-connect" type="submit">
                        <span className="fr-connect__login">S’identifier avec</span>
                        <span className="fr-connect__brand">ProConnect</span>
                      </button>
                    </form>
                    <p>
                      <a
                        className="fr-link"
                        href="https://www.proconnect.gouv.fr/"
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Qu’est-ce que ProConnect ? - nouvelle fenêtre"
                      >
                        Qu’est-ce que ProConnect ?
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NotLoggedLayout>
  );
}
