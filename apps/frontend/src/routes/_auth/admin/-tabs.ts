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

export function getTabs(role: Role | null): TabDescriptor[] {
  return role === ROLES.SUPER_ADMIN ? [...baseTabs, entitesTab] : baseTabs;
}

export function getTabPaths(role: Role | null): string[] {
  const paths = ['/admin/users', '/admin/users/all'];

  return role === ROLES.SUPER_ADMIN ? [...paths, '/admin/entites'] : paths;
}

export function getActiveTab(pathname: string, role: Role | null): number {
  if (pathname === '/admin/users/all') {
    return 1;
  }

  if (role === ROLES.SUPER_ADMIN && (pathname === '/admin/entites' || pathname.startsWith('/admin/entites/'))) {
    return 2;
  }

  return 0;
}
