import { useUserStore } from '@/stores/userStore';
import { SideMenu, type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { useMatchRoute } from '@tanstack/react-router';

const useIsOnUserPage = () => {
  const matchRoute = useMatchRoute();
  return Boolean(matchRoute({ to: '/users', fuzzy: true }) || matchRoute({ to: '/user/$userId', fuzzy: false }));
};
export const SideNav = () => {
  const ADMIN = '/administration' as const;
  const HOME = '/home' as const;
  const CASES = '/cases' as const;
  const ENTITIES = '/entities' as const;
  const USERS = '/users' as const;

  const isOnUserPage = useIsOnUserPage();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const items: SideMenuProps.Item[] = [
    { linkProps: { to: HOME }, text: 'Accueil' },
    ...(isAdmin
      ? [
          { linkProps: { to: ADMIN }, text: 'Administration' },
          { isActive: isOnUserPage, linkProps: { to: USERS }, text: 'Gestion des utilisateurs et des habilitations' },
          { linkProps: { to: ENTITIES }, text: 'Gestion des entités administratives' },
        ]
      : []),
    { linkProps: { to: CASES }, text: 'Gestion des référentiels' },
  ];

  return (
    <>
      <SideMenu align="left" burgerMenuButtonText="Dans cette rubrique" items={items} />
    </>
  );
};
