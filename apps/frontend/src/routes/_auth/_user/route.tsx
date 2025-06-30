import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthLayout } from '@/components/layout/auth/layout';

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
