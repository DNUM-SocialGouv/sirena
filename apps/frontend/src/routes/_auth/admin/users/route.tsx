import { createFileRoute, Outlet } from '@tanstack/react-router';
import { QueryParamsSchema } from '@/schemas/pagination.schema';

export const Route = createFileRoute('/_auth/admin/users')({
  validateSearch: QueryParamsSchema,
  component: RouteComponent,
});

export function RouteComponent() {
  return <Outlet />;
}
