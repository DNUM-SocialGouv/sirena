import { useUserStore } from '@/stores/userStore';
import { SideMenu, type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { useMemo } from 'react';

export const SideNav = () => {
  const ADMIN = '/administration' as const;
  const HOME = '/home' as const;
  const CASES = '/cases' as const;
  const ENTITIES = '/entities' as const;
  const USERS = '/users' as const;

  const isAdmin = useUserStore((state) => state.isAdmin);
  const items = useMemo<SideMenuProps.Item[]>(
    () => [
      { linkProps: { to: HOME }, text: 'Accueil' },
      ...(isAdmin
        ? [
            { linkProps: { to: ADMIN }, text: 'Administration' },
            { linkProps: { to: USERS }, text: 'Gestion des utilisateurs et des habilitations' },
            { linkProps: { to: ENTITIES }, text: 'Gestion des entités administratives' },
          ]
        : []),
      { linkProps: { to: CASES }, text: 'Gestion des référentiels' },
    ],
    [isAdmin, ADMIN, HOME, CASES, ENTITIES, USERS],
  );

  return (
    <>
      <SideMenu align="left" burgerMenuButtonText="Dans cette rubrique" items={items} />
    </>
  );
};
