import { LoginLayout } from '@/components/layout/loginLayout';
import { useUserStore } from '@/stores/userStore';
import ProConnectButton from '@codegouvfr/react-dsfr/ProConnectButton';
import { LoginButton } from '@sirena/ui';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const fallback = '/home' as const;

export const Route = createFileRoute('/login')({
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
  const cookies = document.cookie;
  const { updateIsLogged } = useUserStore();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { state } = search;

  const handleLogin = () => {
    updateIsLogged(true);
    return navigate({ to: search.redirect || fallback });
  };

  const sendedState = localStorage.getItem('sendedState') || '';

  if (cookies.includes('is_logged') && state) {
    if (state && sendedState !== '' && sendedState !== state) {
      return <div>SECURITY ERROR</div>;
    }
    return handleLogin();
  }

  if (cookies.includes('is_logged') && !state) {
    return handleLogin();
  }

  return (
    <div className="p-2">
      <LoginLayout>
        Welcome to login
        <LoginButton />
        <form action="/api/auth/login" method="post">
          <button type="submit">
            <ProConnectButton url="#" />
          </button>
        </form>
      </LoginLayout>
    </div>
  );
}
