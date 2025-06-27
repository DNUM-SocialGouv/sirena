import { requireAuthAndRoles } from '@/lib/auth-guards';
import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/admin/entities')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="home">
      <h2>Welcome to entities</h2>
    </div>
  );
}
