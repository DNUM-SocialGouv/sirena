import { requireAuthAndRoles } from '@/lib/auth-guards';
import { ROLES } from '@sirena/common/constants';
import { Link, createFileRoute } from '@tanstack/react-router';

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
