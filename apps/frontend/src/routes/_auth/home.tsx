import { requireAuth } from '@/lib/auth-guards';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/home')({
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
  const { updateIsAdmin, isAdmin } = useUserStore();
  const handlePermissionsChange = () => {
    updateIsAdmin(!isAdmin);
  };

  return (
    <div className="home">
      <h2>Welcome to home</h2>
      <div className="fr-m-1w">
        <Link to="/administration">Administration</Link>
      </div>
      <div className="fr-m-1w">
        <Button onClick={() => handlePermissionsChange()}> Change permissions </Button>
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
