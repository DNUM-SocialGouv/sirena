import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useId, useMemo, useState } from 'react';
import { useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
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

const WARNING_MODAL_IDS = [warningModalInstance.id];

export const DownloadMenu = ({ requestId, disabled, hasUnsafeFiles }: DownloadMenuProps) => {
  const [accepted, setAccepted] = useState(false);
  const { isOpen, close, toggle, triggerRef, panelRef, onPanelBlur } = useDisclosureMenu();
  const { registerTrigger } = useModalFocusRestore(WARNING_MODAL_IDS);
  const panelId = useId();

  // ZIP entry dates are timezone-less: the backend writes them in the reader timezone so they display correctly.
  const downloadUrl = useMemo(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const query = timeZone ? `?timeZone=${encodeURIComponent(timeZone)}` : '';
    return `/api/requetes-entite/${requestId}/files/download-all${query}`;
  }, [requestId]);
  const pdfUrl = useMemo(() => `/api/requetes-entite/${requestId}/export-pdf`, [requestId]);

  const handleDownloadPdf = () => {
    close();
    window.open(pdfUrl, '_blank');
  };

  const handleDownloadAttachments = () => {
    if (disabled) return;

    if (hasUnsafeFiles) {
      if (triggerRef.current) registerTrigger(triggerRef.current);
      close({ restoreFocus: false });
      setAccepted(false);
      warningModalInstance.open();
      return;
    }

    close();
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
      <div className={styles.wrapper}>
        <button
          type="button"
          ref={triggerRef}
          className={`fr-btn fr-btn--secondary ${styles.trigger}`}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          onClick={toggle}
          onBlur={onPanelBlur}
        >
          Télécharger les documents
          <span
            aria-hidden="true"
            className={`fr-icon-arrow-down-s-line ${styles.chevron}${isOpen ? ` ${styles['chevron--is-open']}` : ''}`}
          />
        </button>

        {isOpen ? (
          <div id={panelId} ref={panelRef} className={styles.panel}>
            <ul className={styles.list}>
              <li>
                <button type="button" className={styles.item} onClick={handleDownloadPdf} onBlur={onPanelBlur}>
                  <span className="fr-icon-file-pdf-line fr-icon--sm" aria-hidden="true" />
                  Télécharger le PDF de la requête
                  <span className="fr-icon-external-link-line fr-icon--sm" aria-hidden="true" />
                  <span className="fr-sr-only"> - nouvel onglet</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={styles.item}
                  aria-disabled={disabled || undefined}
                  onClick={handleDownloadAttachments}
                  onBlur={onPanelBlur}
                >
                  <span className="fr-icon-attachment-line fr-icon--sm" aria-hidden="true" />
                  <span className={styles.item__label}>
                    Télécharger les pièces jointes
                    {disabled ? <span className={styles.item__hint}>Aucune pièce jointe disponible</span> : null}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        ) : null}
      </div>

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
        <p>Le bouton « Télécharger malgré le risque » ne devient actif qu'une fois la case ci-dessous cochée.</p>
        <Checkbox
          className="fr-mt-2w"
          options={[
            {
              label: 'Je comprends les risques et souhaite télécharger l’archive',
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
