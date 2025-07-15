import { Button } from '@codegouvfr/react-dsfr/Button';
import { Menu } from '@sirena/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { profileQueryOptions } from '@/hooks/queries/useProfile';
import './userMenu.css';
import { ROLES, type Role } from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';

export const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useQuery({ ...profileQueryOptions(), enabled: false });
  const navigate = useNavigate();

  const label = useMemo(() => {
    if (!data) {
      return '';
    }
    return `${data?.firstName} ${data?.lastName}`;
  }, [data]);
  const email = useMemo(() => data?.email ?? '', [data?.email]);
  const role = useMemo(() => (data?.role?.id ?? '') as Role | '', [data?.role]);

  const redirectToAdminUsers = () => {
    navigate({
      to: '/admin/users',
    });
  };

  return (
    <Menu.Root onOpenChange={setIsOpen}>
      <Menu.Trigger isOpen={isOpen} className="fr-icon-account-circle-fill fr-btn--icon-left">
        Mon espace
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup>
            <Menu.Header>
              {label}
              <span className="fr-hint-text">{email}</span>
            </Menu.Header>
            <Menu.Separator />
            {role === ROLES.ENTITY_ADMIN && (
              <Menu.Item onClick={() => redirectToAdminUsers()}>
                <div className="user-menu__item">
                  <span className="fr-icon-user-line user-menu__item__icon" aria-hidden="true" />
                  Administration
                </div>
              </Menu.Item>
            )}
            <Menu.Separator />
            <Menu.Footer className="user-menu__footer">
              <form action="/api/auth/logout" method="POST">
                <Button
                  type="submit"
                  className="user-menu__disconnect-btn"
                  iconId="fr-icon-logout-box-r-line"
                  priority="tertiary"
                  size="small"
                >
                  Se déconnecter
                </Button>
              </form>
              <form action="/api/auth/logout-proconnect" method="POST">
                <Button
                  type="submit"
                  className="user-menu__disconnect-btn"
                  iconId="fr-icon-logout-box-r-line"
                  priority="tertiary"
                  size="small"
                >
                  Se déconnecter de ProConnect
                </Button>
              </form>
            </Menu.Footer>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
