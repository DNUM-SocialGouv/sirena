import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFileStatusSSE } from '@/hooks/useFileStatusSSE';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
import { type FileProcessingStatus, getFileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { HttpError } from '@/lib/api/tanstackQuery';
import { formatFileSize } from '@/utils/fileHelpers';
import styles from './FileDownloadLink.module.css';
import { getFileDownloadState, getFileProcessingState } from './fileDownloadState';

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

const POLL_INTERVAL = 3000;
const MAX_POLL_DURATION_MS = 2 * 60 * 1000; // stop polling after 2 minutes

const FILE_TAG_STYLE = {
  valid: {
    backgroundColor: 'var(--background-contrast-info)',
    color: 'var(--blue-cumulus-sun-368-moon-732)',
  },
  intermediate: {
    backgroundColor: 'var(--background-contrast-yellow-moutarde)',
    color: 'var(--yellow-moutarde-sun-348-moon-860)',
  },
  error: {
    backgroundColor: 'var(--background-contrast-error)',
    color: 'var(--text-default-error)',
  },
} as const;

type FileStatusTagProps = {
  // NonNullable : les props de Tag sont une union discriminée avec/sans icône,
  // un iconId potentiellement undefined ne satisfait aucune des deux variantes.
  iconId: NonNullable<React.ComponentProps<typeof Tag>['iconId']>;
  tone: keyof typeof FILE_TAG_STYLE;
  children: React.ReactNode;
};

const FileStatusTag = ({ iconId, tone, children }: FileStatusTagProps) => (
  <Tag as="span" small iconId={iconId} style={FILE_TAG_STYLE[tone]}>
    <span className="fr-sr-only">Statut du fichier : </span>
    {children}
  </Tag>
);

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
  const statusId = useId();

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

  const processingState = useMemo(() => getFileProcessingState(fileStatus), [fileStatus]);
  const downloadState = useMemo(
    () => getFileDownloadState({ processingState, fileName, href, safeHref, target }),
    [processingState, fileName, href, safeHref, target],
  );
  const riskAcknowledgement = downloadState.action.kind === 'acknowledge-risk' ? downloadState.action : null;
  const infectedAcknowledgement = riskAcknowledgement?.reason === 'infected' ? riskAcknowledgement : null;
  const warningAcknowledgement =
    riskAcknowledgement && riskAcknowledgement.reason !== 'infected' ? riskAcknowledgement : null;

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

  const { registerTrigger } = useModalFocusRestore([downloadModal.id, riskModal.id, warningModal.id]);

  // Refs to reset checkbox state when modals open (avoids re-render issues)
  const resetRiskModalRef = useRef<(() => void) | null>(null);
  const resetWarningModalRef = useRef<(() => void) | null>(null);
  const initialPollDoneRef = useRef(false);
  const pollingDisabledRef = useRef(false);
  const sseDisconnectedRef = useRef(false);
  const pollStartedAtRef = useRef<number | null>(null);

  const handleSSEStatusChange = useCallback((status: FileProcessingStatus) => {
    setFileStatus(status);
  }, []);

  const { isConnected: sseConnected } = useFileStatusSSE({
    fileId: fileId || '',
    enabled: !!fileId && !pollingDisabledRef.current && !processingState.isComplete,
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

    if (pollStartedAtRef.current !== null && Date.now() - pollStartedAtRef.current > MAX_POLL_DURATION_MS) {
      pollingDisabledRef.current = true;
      return;
    }

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
    if (!fileId || pollingDisabledRef.current || processingState.isComplete) return;

    // If SSE is connected, don't poll
    if (sseConnected) return;

    if (pollStartedAtRef.current === null) {
      pollStartedAtRef.current = Date.now();
    }

    // Poll immediately on first run if no initial status was provided
    if (!initialPollDoneRef.current && !initialStatus) {
      initialPollDoneRef.current = true;
      pollStatus();
    }

    const interval = setInterval(pollStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fileId, processingState.isComplete, pollStatus, initialStatus, sseConnected]);

  const handleClick = (e: React.MouseEvent) => {
    registerTrigger(e.currentTarget as HTMLElement);
    e.preventDefault();

    switch (downloadState.action.kind) {
      case 'open':
        window.open(downloadState.action.href, downloadState.action.target);
        return;
      case 'confirm-download':
        downloadModal.open();
        return;
      case 'acknowledge-risk':
        if (downloadState.action.reason === 'infected') {
          resetRiskModalRef.current?.();
          riskModal.open();
        } else {
          resetWarningModalRef.current?.();
          warningModal.open();
        }
    }
  };

  const handleOriginalDownload = () => {
    window.open(href, '_blank');
  };

  const displayName = children || (
    <>
      {fileName}
      {fileSize !== undefined && ` (${formatFileSize(fileSize)})`}
    </>
  );

  return (
    <>
      <div className={styles['file-row']}>
        <a
          href={downloadState.linkHref}
          target={target}
          rel={rel}
          className={className}
          onClick={handleClick}
          aria-describedby={statusId}
        >
          {displayName}
          <span className="fr-sr-only"> - nouvel onglet</span>
        </a>
        <p id={statusId} className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {processingState.status ? (
            <FileStatusTag iconId={processingState.status.iconId} tone={processingState.status.tone}>
              {processingState.status.label}
            </FileStatusTag>
          ) : null}
        </p>
      </div>

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
              window.open(downloadState.linkHref, '_blank');
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
        title={infectedAcknowledgement?.content.title ?? ''}
        iconId="fr-icon-warning-line"
        message={infectedAcknowledgement?.content.message ?? ''}
        fileName={fileName}
        cancelLabel="Annuler"
        confirmLabel={infectedAcknowledgement?.content.confirmLabel ?? 'Télécharger malgré le risque'}
        onConfirm={handleOriginalDownload}
        resetRef={resetRiskModalRef}
      />

      <ModalWithCheckbox
        modal={warningModal}
        title={warningAcknowledgement?.content.title ?? 'Téléchargement'}
        iconId="fr-icon-warning-line"
        message={warningAcknowledgement?.content.message ?? ''}
        fileName={fileName}
        cancelLabel="Annuler"
        confirmLabel={warningAcknowledgement?.content.confirmLabel ?? 'Télécharger le fichier original'}
        onConfirm={handleOriginalDownload}
        resetRef={resetWarningModalRef}
      />
    </>
  );
};
