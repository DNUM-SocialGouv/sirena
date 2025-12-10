import { Menu } from '@sirena/ui';
import { useState } from 'react';
import { requetePrioriteBadges } from '@/utils/requeteStatutBadge.constant';
import prioriteStyles from './PrioriteMenu.module.css';
import styles from './statusMenu.module.css';

type PrioriteMenuProps = {
  onPrioriteClick?: (value: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
  value: string | null;
};

export const PrioriteMenu = ({ value, onPrioriteClick, isLoading, disabled }: PrioriteMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const badgeSelected = value ? requetePrioriteBadges.find((badge) => badge.value === value) : null;
  const badgeSelectedClassName = value && badgeSelected ? `fr-badge--${badgeSelected.type}` : '';
  const badgeSelectedText = badgeSelected ? `Priorité : ${badgeSelected.text}` : 'Définir une priorité';

  const badgesFiltred = requetePrioriteBadges.filter((badge) => badge.value !== value);

  const handleClick = (badgeValue: string) => {
    onPrioriteClick?.(badgeValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    onPrioriteClick?.(null);
    setIsOpen(false);
  };

  return (
    <Menu.Root onOpenChange={setIsOpen}>
      <Menu.Trigger
        isOpen={isOpen}
        isLoading={isLoading}
        disabled={disabled}
        className={`fr-badge fr-badge--no-icon fr-badge--sm ${badgeSelectedClassName} ${prioriteStyles['priorite-menu-trigger']}`}
      >
        {badgeSelectedText}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup className={styles['status-menu']}>
            {value && (
              <Menu.Item
                className={`${styles['status-menu__item']} fr-badge fr-badge--no-icon fr-badge--sm`}
                onClick={handleClear}
              >
                Définir une priorité
              </Menu.Item>
            )}
            {badgesFiltred.map((badge) => (
              <Menu.Item
                key={badge.value}
                className={`${styles['status-menu__item']} fr-badge fr-badge--no-icon fr-badge--sm fr-badge--${badge.type}`}
                onClick={() => handleClick(badge.value)}
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
