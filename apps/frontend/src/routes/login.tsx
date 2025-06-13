import { NotLoggedLayout } from '@/components/layout/notLogged';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const fallback = '/home' as const;

export const Route = createFileRoute('/login')({
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
    <div className="p-2">
      <NotLoggedLayout>
        <h2>Connexion à SIRENA</h2>
        <h3>Se connecter via ProConnect</h3>
        <div id="fr-proconnect-button-«r2»" className="fr-connect-group">
          <form action="/api/auth/login" method="post">
            <button className="fr-btn fr-connect pro-connect" type="submit">
              <span className="fr-connect__login">S’identifier avec</span>
              <span className="fr-connect__brand">ProConnect</span>
            </button>
          </form>
          <p>
            <a
              href="https://www.proconnect.gouv.fr/"
              target="_blank"
              rel="noreferrer noopener"
              title="Qu’est-ce que ProConnect ? - nouvelle fenêtre"
            >
              Qu’est-ce que ProConnect ?
            </a>
          </p>
        </div>
      </NotLoggedLayout>
    </div>
  );
}
