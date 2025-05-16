import { LoggedLayout } from '@/components/layout/logged/logged';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';

const fallback = '/login' as const;
const logout = '/api/logout' as const;

export const Route = createFileRoute('/_auth/home')({
  beforeLoad: ({ location, context }) => {
    if (!context.userStore.isLogged) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { updateIsAdmin, isAdmin, updateIsLogged } = useUserStore();
  const handlePermissionsChange = () => {
    updateIsAdmin(!isAdmin);
  };
  const handleLogout = () => {
    updateIsLogged(false);
    const logoutUrl = '/api/logout';
    window.location.href = logoutUrl;
  };

  return (
    <LoggedLayout>
      <div className="home">
        <h1>Welcome to home</h1>
        <Link to="/administration">Administration</Link>
        <Button onClick={() => handlePermissionsChange()}> Change permissions </Button>
        <Button onClick={() => handleLogout()}> Logout </Button>
      </div>
    </LoggedLayout>
  );
}
