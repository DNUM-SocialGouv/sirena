import type { Role } from '@sirena/common/constants';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { requireAuth } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/stores/userStore';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async (params) => {
    requireAuth(params);
    const data = await queryClient.ensureQueryData(profileQueryOptions());
    useUserStore.getState().setRole(data.roleId as Role);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
