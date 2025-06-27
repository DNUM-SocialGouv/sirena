import { AuthLayout } from '@/components/layout/auth/layout';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/_user')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
