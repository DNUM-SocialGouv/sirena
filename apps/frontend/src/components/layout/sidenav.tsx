import { SideMenu, type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { ROLES } from '@sirena/common/constants';
import { useMatchRoute } from '@tanstack/react-router';
import { useUserStore } from '@/stores/userStore';
import './sidenav.css';

const useIsOnUserPage = () => {
  const matchRoute = useMatchRoute();
  return Boolean(
    matchRoute({ to: '/admin/users', fuzzy: true }) || matchRoute({ to: '/admin/user/$userId', fuzzy: false }),
  );
};
export const SideNav = () => {
  const ENTITIES = '/admin/entities' as const;
  const USERS = '/admin/users' as const;
  const FEATURE_FLAGS = '/admin/feature-flags' as const;

  const isOnUserPage = useIsOnUserPage();
  const matchRoute = useMatchRoute();
  const role = useUserStore((s) => s.role);

  const items: SideMenuProps.Item[] = [
    { isActive: isOnUserPage, linkProps: { to: USERS }, text: 'Gestion des utilisateurs et des habilitations' },
    { linkProps: { to: ENTITIES }, text: 'Gestion des entités administratives' },
    ...(role === ROLES.SUPER_ADMIN
      ? [
          {
            isActive: Boolean(matchRoute({ to: FEATURE_FLAGS, fuzzy: true })),
            linkProps: { to: FEATURE_FLAGS },
            text: 'Feature flags',
          },
        ]
      : []),
  ];

  return <SideMenu align="left" burgerMenuButtonText="Dans cette rubrique" items={items} />;
};
