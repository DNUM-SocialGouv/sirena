import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { AUTH_ERROR_CODES, AUTH_ERROR_MESSAGES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { NotAuth } from '@/components/layout/notAuth/layout';
import { requireNotAuth } from '@/lib/auth-guards';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      {
        title: 'Page de connexion - SIRENA',
      },
    ],
  }),

  validateSearch: z.object({
    redirect: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  }),
  beforeLoad: requireNotAuth,
  component: RouteComponent,
});

function RouteComponent() {
  const { error } = Route.useSearch();

  const getErrorMessage = (errorCode: string) => {
    if (errorCode in AUTH_ERROR_CODES) {
      return AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_CODES];
    }
    return errorCode;
  };

  return (
    <NotAuth>
      <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-container fr-background-alt--grey fr-px-md-0 fr-py-10v fr-py-md-14v">
            <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
              <div className="fr-col-12 fr-col-md-9 fr-col-lg-8">
                <h1>Connexion à SIRENA</h1>
                {error && (
                  <Alert
                    severity="error"
                    title="Erreur de connexion"
                    description={getErrorMessage(error)}
                    className="fr-mb-4v"
                  />
                )}
                <div className="fr-mb-6v">
                  <h1>Se connecter avec ProConnect</h1>
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
    </NotAuth>
  );
}
