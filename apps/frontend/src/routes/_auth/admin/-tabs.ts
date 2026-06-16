import { ROLES, type Role } from '@sirena/common/constants';
import type { TabDescriptor } from '@sirena/ui';

const baseTabs: TabDescriptor[] = [
  {
    label: "Gestion des demandes d'habilitations",
    tabPanelId: 'panel-pending',
    tabId: 'tab-pending',
  },
  {
    label: 'Gestion des utilisateurs',
    tabPanelId: 'panel-all',
    tabId: 'tab-all',
  },
];

const entitesTab: TabDescriptor = {
  label: 'Gestion des entités',
  tabPanelId: 'panel-entites',
  tabId: 'tab-entites',
};

const sirecMigrationTab: TabDescriptor = {
  label: 'Migration SIREC',
  tabPanelId: 'panel-sirec-migration',
  tabId: 'tab-sirec-migration',
};

export function getTabs(role: Role | null, hasSirecMigration = false): TabDescriptor[] {
  const tabs = role === ROLES.SUPER_ADMIN ? [...baseTabs, entitesTab] : [...baseTabs];
  if (hasSirecMigration) tabs.push(sirecMigrationTab);
  return tabs;
}

export function getTabPaths(role: Role | null, hasSirecMigration = false): string[] {
  const paths = ['/admin/users', '/admin/users/all'];
  if (role === ROLES.SUPER_ADMIN) paths.push('/admin/entites');
  if (hasSirecMigration) paths.push('/admin/sirec-migration');
  return paths;
}

export function getActiveTab(pathname: string, role: Role | null, hasSirecMigration = false): number {
  if (pathname === '/admin/users/all') return 1;

  if (role === ROLES.SUPER_ADMIN && (pathname === '/admin/entites' || pathname.startsWith('/admin/entites/'))) {
    return 2;
  }

  if (hasSirecMigration && pathname === '/admin/sirec-migration') {
    return role === ROLES.SUPER_ADMIN ? 3 : 2;
  }

  return 0;
}
