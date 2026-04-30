import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entites/$entiteId')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  return <Outlet />;
}
