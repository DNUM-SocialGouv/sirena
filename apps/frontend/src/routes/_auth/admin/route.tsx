import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AdminLayout } from '@/components/layout/admin/layout';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
