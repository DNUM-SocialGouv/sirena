import { LoginLayout } from '@/components/layout/loginLayout';
import { useUserStore } from '@/stores/userStore';
import { LoginButton } from '@sirena/ui';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const fallback = '/home' as const;

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
    state: z.string().optional().catch(''),
    access_token: z.string().optional().catch(''),
    id_token: z.string().optional().catch(''),
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
  const { state, access_token, id_token } = search;

  const handleLogin = () => {
    updateIsLogged(true);
    return navigate({ to: search.redirect || fallback });
  };

  const sendedState = localStorage.getItem('sendedState') || '';
  const register_access_token = localStorage.getItem('access_token') || '';
  if (register_access_token !== '') {
    return handleLogin();
  }

  if (state && sendedState !== '' && sendedState !== state) {
    return <div>SECURITY ERROR</div>;
  }
  if (register_access_token !== '' || (sendedState === state && id_token && access_token)) {
    if (id_token && access_token) {
      localStorage.setItem('id_token', id_token);
      localStorage.setItem('access_token', access_token);
    }
    return handleLogin();
  }

  return (
    <div className="p-2">
      <LoginLayout>
        Welcome to login
        <LoginButton />
      </LoginLayout>
    </div>
  );
}
