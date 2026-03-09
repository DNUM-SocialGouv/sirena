import { Menu } from '@sirena/ui';
import { useState } from 'react';
import styles from './DownloadMenu.module.css';

type DownloadMenuProps = {
  requestId: string;
  disabled?: boolean;
};

export const DownloadMenu = ({ requestId, disabled }: DownloadMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadAttachments = () => {
    window.open(`/api/requetes-entite/${requestId}/files/download-all`, '_blank');
    setIsOpen(false);
  };

  return (
    <Menu.Root onOpenChange={setIsOpen}>
      <Menu.Trigger isOpen={isOpen} className={styles.trigger}>
        Télécharger
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end">
          <Menu.Popup className={styles.popup}>
            <Menu.Item className={styles.item} onClick={handleDownloadAttachments} disabled={disabled}>
              <span className="fr-icon-attachment-line fr-icon--sm" aria-hidden="true" />
              Télécharger les pièces jointes
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
