import { requireAuth } from '@/lib/auth-guards';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/_user/home')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Accueil - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="home">
      <h2>Welcome to home</h2>
      <div className="fr-m-1w">
        <Link to="/admin/administration">Administration</Link>
      </div>
      <form action="/api/auth/logout-proconnect" method="POST">
        <Button className="fr-m-1w" type="submit">
          Proconnect Logout
        </Button>
      </form>
      <form action="/api/auth/logout" method="POST">
        <Button className="fr-m-1w" type="submit">
          Logout
        </Button>
      </form>
    </div>
  );
}
