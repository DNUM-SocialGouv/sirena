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

const entitiesTab: TabDescriptor = {
  label: 'Gestion des entités',
  tabPanelId: 'panel-entities',
  tabId: 'tab-entities',
};

export function getTabs(role: Role | null): TabDescriptor[] {
  return role === ROLES.SUPER_ADMIN ? [...baseTabs, entitiesTab] : baseTabs;
}

export function getTabPaths(role: Role | null): string[] {
  const paths = ['/admin/users', '/admin/users/all'];

  return role === ROLES.SUPER_ADMIN ? [...paths, '/admin/entities'] : paths;
}

export function getActiveTab(pathname: string, role: Role | null): number {
  if (pathname === '/admin/users/all') {
    return 1;
  }

  if (role === ROLES.SUPER_ADMIN && (pathname === '/admin/entities' || pathname.startsWith('/admin/entities/'))) {
    return 2;
  }

  return 0;
}
