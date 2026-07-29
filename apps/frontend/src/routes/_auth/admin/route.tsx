import { FEATURE_FLAGS, ROLES, type Role } from '@sirena/common/constants';
import { Tabs } from '@sirena/ui';
import { createFileRoute, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { AdminLayout } from '@/components/layout/admin/layout';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
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
  const resolvedFlagsQuery = useResolvedFeatureFlags();
  const hasSirecMigration = resolvedFlagsQuery.data?.[FEATURE_FLAGS.SIREC_MIGRATION] ?? false;
  const hasAdminLocalDirectionsServicesFeatureFlag =
    resolvedFlagsQuery.data?.[FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES] ?? false;

  const role = (data?.role?.id ?? null) as Role | null;
  const isAssignedToEntiteAdministrative = role === ROLES.ENTITY_ADMIN && data?.affectationChain?.length === 1;
  const pathname = matches.at(-1)?.pathname ?? '/admin/users';
  const tabs = getTabs(
    role,
    hasSirecMigration,
    hasAdminLocalDirectionsServicesFeatureFlag,
    isAssignedToEntiteAdministrative,
  );
  const tabPaths = getTabPaths(
    role,
    hasSirecMigration,
    hasAdminLocalDirectionsServicesFeatureFlag,
    isAssignedToEntiteAdministrative,
  );
  const activeTab = getActiveTab(
    pathname,
    role,
    hasSirecMigration,
    hasAdminLocalDirectionsServicesFeatureFlag,
    isAssignedToEntiteAdministrative,
  );
  const isUserEditPage = pathname.startsWith('/admin/user/');

  const handleTabChange = useCallback(
    (newTabIndex: number) => {
      navigate({ to: tabPaths[newTabIndex] });
    },
    [navigate, tabPaths],
  );

  if (resolvedFlagsQuery.isPending) {
    return null;
  }

  return (
    <AdminLayout>
      {isUserEditPage ? (
        <Outlet />
      ) : (
        <div className="home">
          <h1 className="fr-mt-3w">Espace administrateur</h1>
          <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange}>
            <Outlet />
          </Tabs>
        </div>
      )}
    </AdminLayout>
  );
}
