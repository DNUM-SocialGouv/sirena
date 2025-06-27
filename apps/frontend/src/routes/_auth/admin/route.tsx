import { AdminLayout } from '@/components/layout/admin/layout';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { ROLES } from '@sirena/common/constants';
import { Outlet, createFileRoute } from '@tanstack/react-router';

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
