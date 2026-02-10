import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Navigate, Outlet, useMatches } from '@tanstack/react-router';
import { AdminLayout } from '@/components/layout/admin/layout';
import { GlobalLayout } from '@/components/layout/globalLayout';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const matches = useMatches();

  const hasChildRoute = matches.some((m) => m.routeId.startsWith('/_auth/admin/'));

  if (!hasChildRoute) {
    return <Navigate to="/admin/users" />;
  }

  return (
    <GlobalLayout>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </GlobalLayout>
  );
}
