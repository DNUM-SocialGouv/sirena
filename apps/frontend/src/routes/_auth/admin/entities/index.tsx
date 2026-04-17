import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entities/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gestion des entités - Espace administrateur -SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <p>La liste des entités administratives</p>;
}
