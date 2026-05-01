import { createFileRoute } from '@tanstack/react-router';
import { AllUsersTab } from '@/components/common/tables/allUsersTab';

export const Route = createFileRoute('/_auth/admin/users/all')({
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
  return <AllUsersTab />;
}
