import { ROLES, type Role } from '@sirena/common/constants';
import { Tabs } from '@sirena/ui';
import { createFileRoute, Navigate, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { AdminLayout } from '@/components/layout/admin/layout';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { getActiveTab, getTabPaths, getTabs } from './-tabs';

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const navigate = useNavigate();
  const matches = useMatches();
  const { data } = useProfile();

  const hasChildRoute = matches.some((match) => match.routeId.startsWith('/_auth/admin/'));

  if (!hasChildRoute) {
    return <Navigate to="/admin/users" />;
  }

  const role = (data?.role?.id ?? null) as Role | null;
  const pathname = matches.at(-1)?.pathname ?? '/admin/users';
  const tabs = getTabs(role);
  const tabPaths = getTabPaths(role);
  const activeTab = getActiveTab(pathname, role);

  const handleTabChange = (newTabIndex: number) => {
    navigate({ to: tabPaths[newTabIndex] });
  };

  return (
    <AdminLayout>
      <div className="home">
        <h1>Espace administrateur</h1>
        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange}>
          <Outlet />
        </Tabs>
      </div>
    </AdminLayout>
  );
}
