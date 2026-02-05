import Badge from '@codegouvfr/react-dsfr/Badge';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFileStatusSSE } from '@/hooks/useFileStatusSSE';
import { type FileProcessingStatus, getFileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { HttpError } from '@/lib/api/tanstackQuery';
import { formatFileSize } from '@/utils/fileHelpers';

// Separate component to isolate checkbox state from parent re-renders
type FrIconId = React.ComponentProps<ReturnType<typeof createModal>['Component']>['iconId'];

const ModalWithCheckbox = ({
  modal,
  title,
  iconId,
  message,
  fileName,
  cancelLabel,
  confirmLabel,
  onConfirm,
  resetRef,
}: {
  modal: ReturnType<typeof createModal>;
  title: string;
  iconId: FrIconId;
  message: string;
  fileName: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  resetRef?: React.MutableRefObject<(() => void) | null>;
}) => {
  const [accepted, setAccepted] = useState(false);

  // Expose reset function to parent via ref (doesn't cause re-render when called)
  useEffect(() => {
    if (resetRef) {
      resetRef.current = () => setAccepted(false);
    }
    return () => {
      if (resetRef) {
        resetRef.current = null;
      }
    };
  }, [resetRef]);

  const handleConfirm = () => {
    if (accepted) {
      onConfirm();
    }
    setAccepted(false);
  };

  const handleCancel = () => {
    setAccepted(false);
  };

  return (
    <modal.Component
      title={title}
      iconId={iconId}
      buttons={[
        {
          doClosesModal: true,
          children: cancelLabel,
          onClick: handleCancel,
        },
        {
          doClosesModal: true,
          children: confirmLabel,
          disabled: !accepted,
          onClick: handleConfirm,
        },
      ]}
    >
      <p>{message}</p>
      <p>
        Le fichier <strong>{fileName}</strong> sera téléchargé dans sa version originale, sans vérification ni
        sécurisation complète.
      </p>
      <Checkbox
        className="fr-mt-2w"
        options={[
          {
            label: 'Je comprends les risques et souhaite télécharger le fichier original',
            nativeInputProps: {
              checked: accepted,
              onChange: (e) => setAccepted(e.target.checked),
            },
          },
        ]}
      />
    </modal.Component>
  );
};

type FileDownloadLinkProps = {
  href: string;
  safeHref?: string;
  fileName: string;
  fileId?: string;
  fileSize?: number;
  className?: string;
  children?: React.ReactNode;
  target?: string;
  rel?: string;
  status?: string;
  scanStatus?: string;
  sanitizeStatus?: string;
};

const isFilePreviewable = (fileName: string): boolean => {
  const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.txt'];
  const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return previewableExtensions.includes(fileExtension);
};

const SCAN_FINAL_STATES = ['CLEAN', 'INFECTED', 'ERROR', 'SKIPPED'];
const SANITIZE_FINAL_STATES = ['COMPLETED', 'ERROR', 'SKIPPED', 'NOT_APPLICABLE'];

const isProcessingComplete = (fileStatus: FileProcessingStatus | null): boolean => {
  if (!fileStatus) return false;

  const scanComplete = SCAN_FINAL_STATES.includes(fileStatus.scanStatus || '');
  const sanitizeComplete = SANITIZE_FINAL_STATES.includes(fileStatus.sanitizeStatus || '');

  return scanComplete && sanitizeComplete;
};

const isSafeFileAvailable = (sanitizeStatus?: string): boolean => {
  return sanitizeStatus === 'COMPLETED';
};

const isFileInfected = (scanStatus?: string): boolean => {
  return scanStatus === 'INFECTED';
};

const needsWarningBeforeDownload = (status: FileProcessingStatus | null): boolean => {
  if (!status) return false;

  const scanPending = status.scanStatus === 'PENDING' || status.scanStatus === 'SCANNING';
  const scanFailed = status.scanStatus === 'ERROR' || status.scanStatus === 'SKIPPED';
  const sanitizePending = status.sanitizeStatus === 'PENDING' || status.sanitizeStatus === 'SANITIZING';
  const sanitizeFailed = status.sanitizeStatus === 'ERROR';

  return scanPending || scanFailed || sanitizePending || sanitizeFailed;
};

type WarningReason = 'scan_pending' | 'scan_failed' | 'sanitize_pending' | 'sanitize_failed' | 'infected' | null;

const getWarningReason = (status: FileProcessingStatus | null): WarningReason => {
  if (!status) return null;

  if (status.scanStatus === 'INFECTED') return 'infected';
  if (status.scanStatus === 'PENDING' || status.scanStatus === 'SCANNING') return 'scan_pending';
  if (status.scanStatus === 'ERROR' || status.scanStatus === 'SKIPPED') return 'scan_failed';
  if (status.sanitizeStatus === 'PENDING' || status.sanitizeStatus === 'SANITIZING') return 'sanitize_pending';
  if (status.sanitizeStatus === 'ERROR') return 'sanitize_failed';

  return null;
};

const getWarningMessage = (
  reason: WarningReason,
): { title: string; message: string; severity: 'warning' | 'error' } => {
  switch (reason) {
    case 'infected':
      return {
        title: 'Fichier potentiellement dangereux',
        message:
          'Une menace potentielle a été détectée dans ce fichier. Nous vous recommandons fortement de ne pas télécharger ce fichier.',
        severity: 'error',
      };
    case 'scan_pending':
      return {
        title: 'Analyse en cours',
        message:
          "L'analyse antivirus de ce fichier n'est pas encore terminée. Nous vous recommandons d'attendre la fin de l'analyse avant de télécharger ce fichier.",
        severity: 'warning',
      };
    case 'scan_failed':
      return {
        title: 'Analyse non effectuée',
        message:
          "L'analyse antivirus de ce fichier a échoué ou n'a pas pu être effectuée. Le fichier n'a pas été vérifié et peut présenter des risques.",
        severity: 'warning',
      };
    case 'sanitize_pending':
      return {
        title: 'Sécurisation en cours',
        message:
          "La sécurisation de ce fichier n'est pas encore terminée. Nous vous recommandons d'attendre la fin de la sécurisation pour télécharger une version sûre du fichier.",
        severity: 'warning',
      };
    case 'sanitize_failed':
      return {
        title: 'Sécurisation échouée',
        message:
          "La sécurisation de ce fichier a échoué. Le fichier original n'a pas pu être nettoyé et peut contenir des éléments potentiellement dangereux.",
        severity: 'warning',
      };
    default:
      return {
        title: 'Téléchargement',
        message: '',
        severity: 'warning',
      };
  }
};

const POLL_INTERVAL = 3000;

export const FileDownloadLink = ({
  href,
  safeHref,
  fileName,
  fileId,
  fileSize,
  className = 'fr-link',
  children,
  target = '_blank',
  rel = 'noopener noreferrer',
  status: initialStatus,
  scanStatus: initialScanStatus,
  sanitizeStatus: initialSanitizeStatus,
}: FileDownloadLinkProps) => {
  const modalId = useId();

  const [fileStatus, setFileStatus] = useState<FileProcessingStatus | null>(() =>
    initialStatus
      ? {
          id: fileId || '',
          status: initialStatus,
          scanStatus: initialScanStatus || 'PENDING',
          sanitizeStatus: initialSanitizeStatus || 'PENDING',
          processingError: null,
          safeFilePath: safeHref || null,
        }
      : null,
  );

  const downloadModal = useMemo(
    () =>
      createModal({
        id: `download-modal-${modalId}`,
        isOpenedByDefault: false,
      }),
    [modalId],
  );

  const riskModal = useMemo(
    () =>
      createModal({
        id: `risk-modal-${modalId}`,
        isOpenedByDefault: false,
      }),
    [modalId],
  );

  const warningModal = useMemo(
    () =>
      createModal({
        id: `warning-modal-${modalId}`,
        isOpenedByDefault: false,
      }),
    [modalId],
  );

  // Refs to reset checkbox state when modals open (avoids re-render issues)
  const resetRiskModalRef = useRef<(() => void) | null>(null);
  const resetWarningModalRef = useRef<(() => void) | null>(null);
  const initialPollDoneRef = useRef(false);
  const pollingDisabledRef = useRef(false);
  const sseDisconnectedRef = useRef(false);

  const handleSSEStatusChange = useCallback((status: FileProcessingStatus) => {
    setFileStatus(status);
  }, []);

  const { isConnected: sseConnected } = useFileStatusSSE({
    fileId: fileId || '',
    enabled: !!fileId && !pollingDisabledRef.current && !isProcessingComplete(fileStatus),
    onStatusChange: handleSSEStatusChange,
  });

  // Track SSE disconnection to fallback to polling
  useEffect(() => {
    if (!sseConnected && !sseDisconnectedRef.current && fileId) {
      sseDisconnectedRef.current = true;
    }
  }, [sseConnected, fileId]);

  const pollStatus = useCallback(async () => {
    if (!fileId || pollingDisabledRef.current) return;
    try {
      const status = await getFileProcessingStatus(fileId);
      setFileStatus(status);
    } catch (error) {
      // Stop polling on 404 (file not found)
      if (error instanceof HttpError && error.status === 404) {
        pollingDisabledRef.current = true;
      }
    }
  }, [fileId]);

  // Fallback to polling if SSE is not connected
  useEffect(() => {
    if (!fileId || pollingDisabledRef.current || isProcessingComplete(fileStatus)) return;

    // If SSE is connected, don't poll
    if (sseConnected) return;

    // Poll immediately on first run if no initial status was provided
    if (!initialPollDoneRef.current && !initialStatus) {
      initialPollDoneRef.current = true;
      pollStatus();
    }

    const interval = setInterval(pollStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fileId, fileStatus, pollStatus, initialStatus, sseConnected]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Case 1: File is infected - show dedicated risk modal
    if (isFileInfected(fileStatus?.scanStatus)) {
      resetRiskModalRef.current?.();
      riskModal.open();
      return;
    }

    // Case 2: Safe version available - open directly
    if (isSafeFileAvailable(fileStatus?.sanitizeStatus) && safeHref) {
      window.open(safeHref, target);
      return;
    }

    // Case 3: File needs warning (scan pending/failed, sanitization pending/failed)
    if (needsWarningBeforeDownload(fileStatus)) {
      resetWarningModalRef.current?.();
      warningModal.open();
      return;
    }

    // Case 4: Non-previewable file without issues - show download modal
    if (!isFilePreviewable(fileName)) {
      downloadModal.open();
      return;
    }

    // Case 5: Normal file - open directly
    window.open(href, target);
  };

  const handleWarningDownload = () => {
    window.open(href, '_blank');
  };

  const renderStatusBadge = () => {
    if (!fileStatus) return null;

    const { scanStatus, sanitizeStatus } = fileStatus;

    // Antivirus statuses take priority - if not clean, show antivirus status only
    switch (scanStatus) {
      case 'PENDING':
        return (
          <Badge severity="info" small noIcon>
            En attente d'analyse antivirus
          </Badge>
        );
      case 'SCANNING':
        return (
          <Badge severity="info" small noIcon>
            Analyse antivirus en cours...
          </Badge>
        );
      case 'SKIPPED':
        return (
          <Badge severity="warning" small noIcon>
            Non analysé (antivirus)
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge severity="warning" small noIcon>
            Analyse antivirus échouée
          </Badge>
        );
    }

    // Scan is CLEAN - show sanitization status if pertinent
    if (scanStatus === 'CLEAN') {
      switch (sanitizeStatus) {
        case 'PENDING':
          return (
            <Badge severity="info" small noIcon>
              En attente de sécurisation
            </Badge>
          );
        case 'SANITIZING':
          return (
            <Badge severity="info" small noIcon>
              Sécurisation...
            </Badge>
          );
        case 'ERROR':
          return (
            <Badge severity="warning" small noIcon>
              Sécurisation échouée
            </Badge>
          );
        case 'COMPLETED':
          return (
            <Badge severity="success" small noIcon>
              Sécurisé
            </Badge>
          );
        case 'SKIPPED':
        case 'NOT_APPLICABLE':
          return (
            <Badge severity="success" small noIcon>
              Vérifié
            </Badge>
          );
      }
    }

    return null;
  };

  const displayName = children || (
    <>
      {fileName}
      {fileSize !== undefined && ` (${formatFileSize(fileSize)})`}
    </>
  );

  const displayHref = isSafeFileAvailable(fileStatus?.sanitizeStatus) && safeHref ? safeHref : href;

  return (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={displayHref} target={target} rel={rel} className={className} onClick={handleClick}>
          {displayName}
          <span className="fr-sr-only"> - nouvel onglet</span>
        </a>
        {isFileInfected(fileStatus?.scanStatus) ? (
          <Badge severity="error" small noIcon>
            Risque détecté
          </Badge>
        ) : (
          renderStatusBadge()
        )}
      </span>

      <downloadModal.Component
        title="Téléchargement de fichier"
        iconId="fr-icon-download-line"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
          },
          {
            doClosesModal: true,
            children: 'Télécharger',
            onClick: () => {
              const downloadUrl = isSafeFileAvailable(fileStatus?.sanitizeStatus) && safeHref ? safeHref : href;
              window.open(downloadUrl, '_blank');
            },
          },
        ]}
      >
        <p>
          Le fichier <strong>{fileName}</strong> ne peut pas être prévisualisé dans le navigateur.
        </p>
        <p>Voulez-vous télécharger ce fichier ?{fileSize !== undefined && ` (${formatFileSize(fileSize)})`}</p>
      </downloadModal.Component>

      <ModalWithCheckbox
        modal={riskModal}
        title="Attention : fichier potentiellement dangereux"
        iconId="fr-icon-warning-line"
        message="Une menace potentielle a été détectée dans ce fichier. Nous vous recommandons fortement de ne pas télécharger ce fichier. Si vous choisissez de continuer, assurez-vous que votre logiciel antivirus est à jour."
        fileName={fileName}
        cancelLabel="Annuler"
        confirmLabel="Télécharger malgré le risque"
        onConfirm={() => window.open(href, '_blank')}
        resetRef={resetRiskModalRef}
      />

      <ModalWithCheckbox
        modal={warningModal}
        title={getWarningMessage(getWarningReason(fileStatus)).title}
        iconId="fr-icon-warning-line"
        message={getWarningMessage(getWarningReason(fileStatus)).message}
        fileName={fileName}
        cancelLabel="Annuler"
        confirmLabel="Télécharger le fichier original"
        onConfirm={handleWarningDownload}
        resetRef={resetWarningModalRef}
      />
    </>
  );
};
