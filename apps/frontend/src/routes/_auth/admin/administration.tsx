import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Link } from '@tanstack/react-router';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/administration')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="administration">
      <h2>Welcome to administration</h2>
      <p>This is the administration page.</p>
      <Link to="/home">Home</Link>
    </div>
  );
}
