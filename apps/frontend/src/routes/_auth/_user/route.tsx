import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthLayout } from '@/components/layout/auth/layout';
import { GlobalLayout } from '@/components/layout/globalLayout';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <GlobalLayout>
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    </GlobalLayout>
  );
}
