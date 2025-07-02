import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Navigate, Outlet, useMatches } from '@tanstack/react-router';
import { AdminLayout } from '@/components/layout/admin/layout';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const matches = useMatches();

  const hasChildRoute = matches.some((m) => m.routeId.startsWith('/_auth/admin/'));

  if (!hasChildRoute) {
    return <Navigate to="/admin/users" />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
