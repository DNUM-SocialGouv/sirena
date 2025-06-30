import { profileQueryOptions } from '@/hooks/queries/useProfile';
import { queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/stores/userStore';
import type { Role } from '@sirena/common/constants';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const data = await queryClient.ensureQueryData(profileQueryOptions());
    useUserStore.getState().setRole(data.roleId as Role);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
