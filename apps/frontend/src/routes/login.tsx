import { LoginLayout } from '@/components/layout/loginLayout';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const fallback = '/home' as const;

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.userStore.isLogged) {
      throw redirect({ to: search.redirect || fallback });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { updateIsLogged } = useUserStore();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const handleLogin = () => {
    updateIsLogged(true);
    navigate({ to: search.redirect || fallback });
  };

  return (
    <LoginLayout>
      Welcome to login
      <Button onClick={() => handleLogin()}>Login</Button>
    </LoginLayout>
  );
}
