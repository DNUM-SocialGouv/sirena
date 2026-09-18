import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { useId, useMemo, useRef } from 'react';
import { useFileProcessingStatus } from '@/hooks/useFileProcessingStatus';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { formatFileSize } from '@/utils/fileHelpers';
import styles from './FileDownloadLink.module.css';
import { getFileDownloadState, getFileProcessingState } from './fileDownloadState';
import { RiskAcknowledgementModal, type RiskAcknowledgementModalHandle } from './RiskAcknowledgementModal';

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

  const initialFileStatus = useMemo<FileProcessingStatus | null>(
    () =>
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
    [fileId, initialStatus, initialScanStatus, initialSanitizeStatus, safeHref],
  );
  const fileStatus = useFileProcessingStatus({ fileId, initialStatus: initialFileStatus });
  const processingState = useMemo(() => getFileProcessingState(fileStatus), [fileStatus]);
  const downloadState = useMemo(
    () => getFileDownloadState({ processingState, fileName, href, safeHref, target }),
    [processingState, fileName, href, safeHref, target],
  );
  const downloadModal = useMemo(
    () =>
      createModal({
        id: `download-modal-${modalId}`,
        isOpenedByDefault: false,
      }),
    [modalId],
  );

  const { registerTrigger } = useModalFocusRestore([downloadModal.id]);
  const riskAcknowledgementModalRef = useRef<RiskAcknowledgementModalHandle>(null);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const trigger = event.currentTarget as HTMLElement;

    switch (downloadState.action.kind) {
      case 'open':
        window.open(downloadState.action.href, downloadState.action.target);
        return;
      case 'confirm-download':
        registerTrigger(trigger);
        downloadModal.open();
        return;
      case 'acknowledge-risk': {
        const action = downloadState.action;
        riskAcknowledgementModalRef.current?.open({
          trigger,
          content: {
            title: action.content.title,
            message: action.content.message,
            details: (
              <p>
                Le fichier <strong>{fileName}</strong> sera téléchargé dans sa version originale, sans vérification ni
                sécurisation complète.
              </p>
            ),
            acknowledgementLabel: 'Je comprends les risques et souhaite télécharger le fichier original',
            confirmLabel: action.content.confirmLabel,
          },
          onConfirm: () => window.open(action.href, action.target),
        });
      }
    }
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

      <RiskAcknowledgementModal ref={riskAcknowledgementModalRef} />
    </>
  );
};
