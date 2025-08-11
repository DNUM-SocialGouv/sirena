import { Menu } from '@sirena/ui';
import { useState } from 'react';
import styles from './statusMenu.module.css';

type Badge = {
  type: string;
  text: string;
  value: string;
};

type StatutMenuProps = {
  badges: Badge[];
  onBadgeClick?: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  value: string | null;
};

export const StatusMenu = ({ badges, value, onBadgeClick, isLoading, disabled }: StatutMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const badgeSelected = badges.find((badge) => badge.value === value) || null;
  const badgeSelectedClassName = value ? `fr-badge--${badgeSelected?.type}` : '';
  const badgeSelectedText = badgeSelected ? badgeSelected.text : 'Sélectionner un statut';

  const badgesFiltred = badges.filter((badge) => badge.value !== value);

  return (
    <Menu.Root onOpenChange={setIsOpen}>
      <Menu.Trigger
        isOpen={isOpen}
        isLoading={isLoading}
        disabled={disabled}
        className={`fr-badge  fr-badge--sm ${badgeSelectedClassName}`}
      >
        {badgeSelectedText}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup className={styles['status-menu']}>
            {badgesFiltred.map((badge) => (
              <Menu.Item
                key={badge.value}
                className={`${styles['status-menu__item']} fr-badge fr-badge--sm fr-badge--${badge.type}`}
                onClick={() => onBadgeClick?.(badge.value)}
              >
                {badge.text}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
