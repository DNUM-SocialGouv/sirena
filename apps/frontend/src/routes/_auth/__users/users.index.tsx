import { PendingUsersTab } from '@/components/hoc/PendingUsersTab';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/__users/users/')({
  beforeLoad: requireAuthAndAdmin,
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
