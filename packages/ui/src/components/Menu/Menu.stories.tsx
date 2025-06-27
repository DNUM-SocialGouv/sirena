import { Button } from '@codegouvfr/react-dsfr/Button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import Menu from './Menu';

const meta: Meta = {
  component: Menu.Root,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Menu.Root>;

export const Basic: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Menu.Root onOpenChange={setIsOpen}>
        <Menu.Trigger isOpen={isOpen} className="fr-icon-account-circle-fill fr-btn--icon-left">
          Mon espace
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start">
            <Menu.Popup>
              <Menu.Header>
                Libellé [Prénom Nom] Utilisateur
                <span className="fr-hint-text">mail@domain.fr</span>
              </Menu.Header>
              <Menu.Separator />
              <Menu.Item>Item 1</Menu.Item>
              <Menu.Separator />
              <Menu.Item>Item 2</Menu.Item>
              <Menu.Separator />
              <Menu.Item>Item 3</Menu.Item>
              <Menu.Footer>
                <Button
                  className="menu__popup__disconnect-btn"
                  iconId="fr-icon-checkbox-circle-line"
                  priority="tertiary"
                  size="small"
                >
                  Se déconnecter
                </Button>
              </Menu.Footer>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );
  },
};
