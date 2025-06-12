import { PendingUsersTab } from '@/components/hoc/PendingUsersTab';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/__users/users/')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

export function RouteComponent() {
  return <PendingUsersTab />;
}
