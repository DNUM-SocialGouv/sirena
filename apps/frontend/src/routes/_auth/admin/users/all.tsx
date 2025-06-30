import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { AllUsersTab } from '@/components/hoc/allUsersTab.tsx';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/users/all')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gérer les utilisateurs - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

export function RouteComponent() {
  return (
    <div>
      <AllUsersTab />
    </div>
  );
}
