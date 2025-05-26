import { LoginLayout } from '@/components/layout/loginLayout';
import ProConnectButton from '@codegouvfr/react-dsfr/ProConnectButton';
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
  // TODO handle errors

  return (
    <div className="p-2">
      <LoginLayout>
        Welcome to login
        <form action="/api/auth/login" method="post">
          <button type="submit">
            <ProConnectButton url="#" />
          </button>
        </form>
      </LoginLayout>
    </div>
  );
}
