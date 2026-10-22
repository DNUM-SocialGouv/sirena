import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/admin/')({
  component: RouteComponent,
});

export function RouteComponent() {
  // Replace the history entry: the admin breadcrumb root links here, going back must not bounce on it
  return <Navigate to="/admin/users" replace />;
}
