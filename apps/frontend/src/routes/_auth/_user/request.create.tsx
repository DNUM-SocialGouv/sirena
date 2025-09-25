import { createFileRoute } from '@tanstack/react-router';
import { RequestForm } from '@/components/requestForm/RequestForm';
import { requireAuth } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <RequestForm mode="create" />;
}
