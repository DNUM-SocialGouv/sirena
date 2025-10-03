import { createFileRoute, Outlet } from '@tanstack/react-router';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { requireAuth } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async (params) => {
    requireAuth(params);
    await queryClient.ensureQueryData(profileQueryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
