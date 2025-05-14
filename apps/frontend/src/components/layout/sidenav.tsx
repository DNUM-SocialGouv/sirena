import { useUserStore } from '@/stores/userStore';
import { SideMenu, type SideMenuProps } from '@codegouvfr/react-dsfr/SideMenu';
import { useMemo } from 'react';

export const SideNav = () => {
  const ADMIN = '/administration' as const;
  const HOME = '/home' as const;

  const isAdmin = useUserStore((state) => state.isAdmin);
  const items = useMemo<SideMenuProps.Item[]>(
    () => [
      { linkProps: { to: HOME }, text: 'Accueil' },
      ...(isAdmin ? [{ linkProps: { to: ADMIN }, text: 'Administration' }] : []),
    ],
    [isAdmin, ADMIN, HOME],
  );

  return <SideMenu align="left" burgerMenuButtonText="Dans cette rubrique" items={items} />;
};
