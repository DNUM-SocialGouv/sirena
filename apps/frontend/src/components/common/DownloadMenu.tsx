import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Menu } from '@sirena/ui';
import { useMemo, useState } from 'react';
import styles from './DownloadMenu.module.css';

type DownloadMenuProps = {
  requestId: string;
  disabled?: boolean;
  hasUnsafeFiles?: boolean;
};

const warningModalInstance = createModal({
  id: 'download-zip-warning-modal',
  isOpenedByDefault: false,
});

export const DownloadMenu = ({ requestId, disabled, hasUnsafeFiles }: DownloadMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const downloadUrl = useMemo(() => `/api/requetes-entite/${requestId}/files/download-all`, [requestId]);

  const handleDownloadAttachments = () => {
    setIsOpen(false);
    if (hasUnsafeFiles) {
      setAccepted(false);
      warningModalInstance.open();
      return;
    }
    window.open(downloadUrl, '_blank');
  };

  const handleConfirmDownload = () => {
    if (accepted) {
      window.open(downloadUrl, '_blank');
    }
    setAccepted(false);
  };

  return (
    <>
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

      <warningModalInstance.Component
        title="Attention : pièces jointes potentiellement dangereuses"
        iconId="fr-icon-warning-line"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
            onClick: () => setAccepted(false),
          },
          {
            doClosesModal: true,
            children: 'Télécharger malgré le risque',
            disabled: !accepted,
            onClick: handleConfirmDownload,
          },
        ]}
      >
        <p>
          Certaines pièces jointes de cette requête n'ont pas pu être vérifiées ou sécurisées, ou présentent un risque
          détecté. Nous vous recommandons de ne pas télécharger cette archive sans précaution.
        </p>
        <p>Si vous choisissez de continuer, assurez-vous que votre logiciel antivirus est à jour.</p>
        <Checkbox
          className="fr-mt-2w"
          options={[
            {
              label: 'Je comprends les risques et souhaite télécharger l\u2019archive',
              nativeInputProps: {
                checked: accepted,
                onChange: (e) => setAccepted(e.target.checked),
              },
            },
          ]}
        />
      </warningModalInstance.Component>
    </>
  );
};
