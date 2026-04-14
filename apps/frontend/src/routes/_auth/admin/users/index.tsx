import { createFileRoute } from '@tanstack/react-router';
import { PendingUsersTab } from '@/components/common/tables/pendingUsersTab';

export const Route = createFileRoute('/_auth/admin/users/')({
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
