import { PendingUsersTab } from '@/components/hoc/PendingUsersTab';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/admin/users/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Utilisateurs en attente de validation - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

export function RouteComponent() {
  return <PendingUsersTab />;
}
