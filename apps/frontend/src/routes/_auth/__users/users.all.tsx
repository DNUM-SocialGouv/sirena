import { AllUsersTab } from '@/components/hoc/allUsersTab.tsx';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/__users/users/all')({
  beforeLoad: requireAuthAndAdmin,
  head: () => ({
    meta: [
      {
        title: 'Gérer tous les utilisateurs - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

export function RouteComponent() {
  return (
    <div>
      <h3>Tous les utilisateurs</h3>
      <AllUsersTab />
    </div>
  );
}
