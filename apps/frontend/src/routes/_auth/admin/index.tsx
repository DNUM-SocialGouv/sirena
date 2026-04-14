import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/admin/')({
  component: RouteComponent,
});

export function RouteComponent() {
  return <Navigate to="/admin/users" />;
}
