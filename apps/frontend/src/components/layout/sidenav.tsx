import { SideMenu, type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { useMatchRoute } from '@tanstack/react-router';
import './sidenav.css';

const useIsOnUserPage = () => {
  const matchRoute = useMatchRoute();
  return Boolean(
    matchRoute({ to: '/admin/users', fuzzy: true }) || matchRoute({ to: '/admin/user/$userId', fuzzy: false }),
  );
};
export const SideNav = () => {
  const ADMIN = '/admin/administration' as const;
  const ENTITIES = '/admin/entities' as const;
  const USERS = '/admin/users' as const;

  const isOnUserPage = useIsOnUserPage();
  const items: SideMenuProps.Item[] = [
    { linkProps: { to: ADMIN }, text: 'Administration' },
    { isActive: isOnUserPage, linkProps: { to: USERS }, text: 'Gestion des utilisateurs et des habilitations' },
    { linkProps: { to: ENTITIES }, text: 'Gestion des entités administratives' },
  ];

  return <SideMenu align="left" burgerMenuButtonText="Dans cette rubrique" items={items} />;
};
