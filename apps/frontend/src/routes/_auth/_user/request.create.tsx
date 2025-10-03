import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { RequestForm } from '@/components/requestForm/RequestForm';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create')({
  beforeLoad: requireAuthAndRoles([ROLES.WRITER, ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING]),
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
