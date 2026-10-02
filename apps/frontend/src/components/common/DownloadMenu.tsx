import { useId, useMemo, useRef } from 'react';
import { useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import styles from './DownloadMenu.module.css';
import { RiskAcknowledgementModal, type RiskAcknowledgementModalHandle } from './RiskAcknowledgementModal';

type DownloadMenuProps = {
  requestId: string;
  disabled?: boolean;
  hasUnsafeFiles?: boolean;
};

export const DownloadMenu = ({ requestId, disabled, hasUnsafeFiles }: DownloadMenuProps) => {
  const { isOpen, close, toggle, triggerRef, panelRef, onPanelBlur } = useDisclosureMenu();
  const panelId = useId();
  const riskAcknowledgementModalRef = useRef<RiskAcknowledgementModalHandle>(null);

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

  const handleDownloadAttachments = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (hasUnsafeFiles) {
      const trigger = triggerRef.current ?? event.currentTarget;
      close({ restoreFocus: false });
      riskAcknowledgementModalRef.current?.open({
        trigger,
        content: {
          title: 'Attention : pièces jointes potentiellement dangereuses',
          message:
            "Certaines pièces jointes de cette requête n'ont pas pu être vérifiées ou sécurisées, ou présentent un risque détecté. Nous vous recommandons de ne pas télécharger cette archive sans précaution.",
          details: (
            <>
              <p>Si vous choisissez de continuer, assurez-vous que votre logiciel antivirus est à jour.</p>
              <p>Le bouton « Télécharger malgré le risque » ne devient actif qu'une fois la case ci-dessous cochée.</p>
            </>
          ),
          acknowledgementLabel: 'Je comprends les risques et souhaite télécharger l’archive',
          confirmLabel: 'Télécharger malgré le risque',
        },
        onConfirm: () => window.open(downloadUrl, '_blank'),
      });
      return;
    }

    close();
    window.open(downloadUrl, '_blank');
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

      <RiskAcknowledgementModal ref={riskAcknowledgementModalRef} />
    </>
  );
};
