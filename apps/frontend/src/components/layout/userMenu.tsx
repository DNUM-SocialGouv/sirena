import { profileQueryOptions } from '@/hooks/queries/useProfile';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Menu } from '@sirena/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useQuery({ ...profileQueryOptions(), enabled: false });

  const label = useMemo(() => {
    if (!data) {
      return '';
    }
    return `${data?.firstName} ${data?.lastName}`;
  }, [data]);
  const email = useMemo(() => data?.email ?? '', [data?.email]);

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
            <Menu.Footer>
              <form action="/api/auth/logout-proconnect" method="POST">
                <Button
                  type="submit"
                  className="menu__popup__disconnect-btn"
                  iconId="fr-icon-checkbox-circle-line"
                  priority="tertiary"
                  size="small"
                >
                  Se déconnecter
                </Button>
              </form>
            </Menu.Footer>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
