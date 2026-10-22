import { ROLES, type Role } from '@sirena/common/constants';
import type { TabDescriptor } from '@sirena/ui';

// Shared with the admin breadcrumb, so that tabs and crumbs keep the same wording
export const ADMIN_TAB_LABELS = {
  pending: "Demandes d'habilitation",
  users: 'Utilisateurs',
  entites: 'Entités',
  // A root-level entity admin manages their own entity only
  localEntite: 'Entité',
  directionsServices: 'Directions et services',
} as const;

const baseTabs: TabDescriptor[] = [
  {
    label: ADMIN_TAB_LABELS.pending,
    tabPanelId: 'panel-pending',
    tabId: 'tab-pending',
    dataTestId: 'admin-tab-pending',
  },
  {
    label: ADMIN_TAB_LABELS.users,
    tabPanelId: 'panel-all',
    tabId: 'tab-all',
    dataTestId: 'admin-tab-all',
  },
];

const entitesTab: TabDescriptor = {
  label: ADMIN_TAB_LABELS.entites,
  tabPanelId: 'panel-entites',
  tabId: 'tab-entites',
  dataTestId: 'admin-tab-entites',
};

const localEntitesTab: TabDescriptor = {
  label: ADMIN_TAB_LABELS.localEntite,
  tabPanelId: 'panel-local-entites',
  tabId: 'tab-local-entites',
  dataTestId: 'admin-tab-local-entites',
};

const localDirectionsServicesTab: TabDescriptor = {
  label: ADMIN_TAB_LABELS.directionsServices,
  tabPanelId: 'panel-local-directions-services',
  tabId: 'tab-local-directions-services',
  dataTestId: 'admin-tab-local-directions-services',
};

const sirecMigrationTab: TabDescriptor = {
  label: 'Migration SIREC',
  tabPanelId: 'panel-sirec-migration',
  tabId: 'tab-sirec-migration',
  dataTestId: 'admin-tab-sirec-migration',
};

export function getTabs(
  role: Role | null,
  hasSirecMigration = false,
  hasAdminLocalDirectionsServicesFeatureFlag = false,
  isAssignedToEntiteAdministrative = false,
): TabDescriptor[] {
  const tabs = role === ROLES.SUPER_ADMIN ? [...baseTabs, entitesTab] : [...baseTabs];

  if (role === ROLES.ENTITY_ADMIN && hasAdminLocalDirectionsServicesFeatureFlag) {
    if (isAssignedToEntiteAdministrative) {
      tabs.push(localEntitesTab);
    }
    tabs.push(localDirectionsServicesTab);
  }

  if (hasSirecMigration) {
    tabs.push(sirecMigrationTab);
  }

  return tabs;
}

export function getTabPaths(
  role: Role | null,
  hasSirecMigration = false,
  hasAdminLocalDirectionsServicesFeatureFlag = false,
  isAssignedToEntiteAdministrative = false,
): string[] {
  const paths = ['/admin/users', '/admin/users/all'];

  if (role === ROLES.SUPER_ADMIN) {
    paths.push('/admin/entites');
  }

  if (role === ROLES.ENTITY_ADMIN && hasAdminLocalDirectionsServicesFeatureFlag) {
    if (isAssignedToEntiteAdministrative) {
      paths.push('/admin/entite');
    }
    paths.push('/admin/directions-services');
  }

  if (hasSirecMigration) {
    paths.push('/admin/sirec-migration');
  }

  return paths;
}

export function getActiveTab(
  pathname: string,
  role: Role | null,
  hasSirecMigration = false,
  hasAdminLocalDirectionsServicesFeatureFlag = false,
  isAssignedToEntiteAdministrative = false,
): number {
  if (pathname === '/admin/users/all') return 1;

  if (role === ROLES.SUPER_ADMIN && (pathname === '/admin/entites' || pathname.startsWith('/admin/entites/'))) {
    return 2;
  }

  if (role === ROLES.ENTITY_ADMIN && hasAdminLocalDirectionsServicesFeatureFlag) {
    if (isAssignedToEntiteAdministrative && (pathname === '/admin/entite' || pathname.startsWith('/admin/entite/'))) {
      return 2;
    }

    if (pathname === '/admin/directions-services' || pathname.startsWith('/admin/directions-services/')) {
      return isAssignedToEntiteAdministrative ? 3 : 2;
    }
  }

  if (hasSirecMigration && pathname === '/admin/sirec-migration') {
    return (
      getTabPaths(role, hasSirecMigration, hasAdminLocalDirectionsServicesFeatureFlag, isAssignedToEntiteAdministrative)
        .length - 1
    );
  }

  return 0;
}
