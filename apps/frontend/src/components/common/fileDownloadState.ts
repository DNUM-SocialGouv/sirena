import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';

const SCAN_FINAL_STATES = ['CLEAN', 'INFECTED', 'ERROR', 'SKIPPED'];

const SANITIZE_FINAL_STATES = ['COMPLETED', 'ERROR', 'SKIPPED', 'NOT_APPLICABLE'];

export type FileStatusPresentation = {
  label: string;
  iconId:
    | 'fr-icon-time-fill'
    | 'fr-icon-refresh-fill'
    | 'fr-icon-question-fill'
    | 'fr-icon-error-warning-fill'
    | 'fr-icon-warning-fill'
    | 'fr-icon-checkbox-circle-fill';
  tone: 'valid' | 'intermediate' | 'error';
};

type FileWarningReason = 'scan_pending' | 'scan_failed' | 'sanitize_pending' | 'sanitize_failed';

export type FileProcessingRisk =
  | { kind: 'infected'; reason: 'infected' }
  | { kind: 'warning'; reason: FileWarningReason };

export type FileProcessingState = {
  isComplete: boolean;
  isSafeFileAvailable: boolean;
  status: FileStatusPresentation | null;
  risk: FileProcessingRisk | null;
};

const getStatusPresentation = (status: FileProcessingStatus | null): FileStatusPresentation | null => {
  switch (status?.scanStatus) {
    case 'PENDING':
      return {
        label: "En attente d'analyse antivirus",
        iconId: 'fr-icon-time-fill',
        tone: 'intermediate',
      };
    case 'SCANNING':
      return {
        label: 'Analyse antivirus en cours',
        iconId: 'fr-icon-refresh-fill',
        tone: 'intermediate',
      };
    case 'SKIPPED':
      return {
        label: "Non analysé par l'antivirus",
        iconId: 'fr-icon-question-fill',
        tone: 'intermediate',
      };
    case 'ERROR':
      return {
        label: 'Analyse antivirus échouée',
        iconId: 'fr-icon-error-warning-fill',
        tone: 'error',
      };
    case 'INFECTED':
      return {
        label: "Risque détecté par l'antivirus",
        iconId: 'fr-icon-warning-fill',
        tone: 'error',
      };
    case 'CLEAN':
      break;
    default:
      return null;
  }

  switch (status.sanitizeStatus) {
    case 'PENDING':
      return {
        label: 'En attente de sécurisation',
        iconId: 'fr-icon-time-fill',
        tone: 'intermediate',
      };
    case 'SANITIZING':
      return {
        label: 'Sécurisation en cours',
        iconId: 'fr-icon-refresh-fill',
        tone: 'intermediate',
      };
    case 'ERROR':
      return {
        label: 'Sécurisation échouée',
        iconId: 'fr-icon-error-warning-fill',
        tone: 'error',
      };
    case 'COMPLETED':
      return {
        label: 'Analysé et sécurisé',
        iconId: 'fr-icon-checkbox-circle-fill',
        tone: 'valid',
      };
    case 'SKIPPED':
    case 'NOT_APPLICABLE':
      return {
        label: 'Analysé, aucun risque détecté',
        iconId: 'fr-icon-checkbox-circle-fill',
        tone: 'valid',
      };
    default:
      return null;
  }
};

const getRisk = (status: FileProcessingStatus | null): FileProcessingRisk | null => {
  if (!status) {
    return null;
  }

  if (status.scanStatus === 'INFECTED') {
    return { kind: 'infected', reason: 'infected' };
  }
  if (status.scanStatus === 'PENDING' || status.scanStatus === 'SCANNING') {
    return { kind: 'warning', reason: 'scan_pending' };
  }
  if (status.scanStatus === 'ERROR' || status.scanStatus === 'SKIPPED') {
    return { kind: 'warning', reason: 'scan_failed' };
  }
  if (status.sanitizeStatus === 'PENDING' || status.sanitizeStatus === 'SANITIZING') {
    return { kind: 'warning', reason: 'sanitize_pending' };
  }
  if (status.sanitizeStatus === 'ERROR') {
    return { kind: 'warning', reason: 'sanitize_failed' };
  }

  return null;
};

export const getFileProcessingState = (status: FileProcessingStatus | null): FileProcessingState => ({
  isComplete:
    status !== null &&
    SCAN_FINAL_STATES.includes(status.scanStatus) &&
    SANITIZE_FINAL_STATES.includes(status.sanitizeStatus),
  isSafeFileAvailable: status?.sanitizeStatus === 'COMPLETED',
  status: getStatusPresentation(status),
  risk: getRisk(status),
});

const PREVIEWABLE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.txt'];

const isFilePreviewable = (fileName: string): boolean => {
  const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return PREVIEWABLE_EXTENSIONS.includes(fileExtension);
};

type RiskAcknowledgementContent = {
  title: string;
  message: string;
  confirmLabel: string;
  severity: 'warning' | 'error';
};

const RISK_ACKNOWLEDGEMENT_CONTENT: Record<FileProcessingRisk['reason'], RiskAcknowledgementContent> = {
  infected: {
    title: 'Attention : fichier potentiellement dangereux',
    message:
      'Une menace potentielle a été détectée dans ce fichier. Nous vous recommandons fortement de ne pas télécharger ce fichier. Si vous choisissez de continuer, assurez-vous que votre logiciel antivirus est à jour.',
    confirmLabel: 'Télécharger malgré le risque',
    severity: 'error',
  },
  scan_pending: {
    title: 'Analyse en cours',
    message:
      "L'analyse antivirus de ce fichier n'est pas encore terminée. Nous vous recommandons d'attendre la fin de l'analyse avant de télécharger ce fichier.",
    confirmLabel: 'Télécharger le fichier original',
    severity: 'warning',
  },
  scan_failed: {
    title: 'Analyse non effectuée',
    message:
      "L'analyse antivirus de ce fichier a échoué ou n'a pas pu être effectuée. Le fichier n'a pas été vérifié et peut présenter des risques.",
    confirmLabel: 'Télécharger le fichier original',
    severity: 'warning',
  },
  sanitize_pending: {
    title: 'Sécurisation en cours',
    message:
      "La sécurisation de ce fichier n'est pas encore terminée. Nous vous recommandons d'attendre la fin de la sécurisation pour télécharger une version sûre du fichier.",
    confirmLabel: 'Télécharger le fichier original',
    severity: 'warning',
  },
  sanitize_failed: {
    title: 'Sécurisation échouée',
    message:
      "La sécurisation de ce fichier a échoué. Le fichier original n'a pas pu être nettoyé et peut contenir des éléments potentiellement dangereux.",
    confirmLabel: 'Télécharger le fichier original',
    severity: 'warning',
  },
};

type FileDownloadAction =
  | { kind: 'open'; href: string; target: string }
  | { kind: 'confirm-download'; href: string; target: '_blank' }
  | {
      kind: 'acknowledge-risk';
      reason: FileProcessingRisk['reason'];
      href: string;
      target: '_blank';
      content: RiskAcknowledgementContent;
    };

export type FileDownloadState = {
  linkHref: string;
  action: FileDownloadAction;
};

type GetFileDownloadStateOptions = {
  processingState: FileProcessingState;
  fileName: string;
  href: string;
  safeHref?: string;
  target: string;
};

export const getFileDownloadState = ({
  processingState,
  fileName,
  href,
  safeHref,
  target,
}: GetFileDownloadStateOptions): FileDownloadState => {
  const linkHref = processingState.isSafeFileAvailable && safeHref ? safeHref : href;

  if (processingState.risk?.kind === 'infected') {
    return {
      linkHref,
      action: {
        kind: 'acknowledge-risk',
        reason: processingState.risk.reason,
        href,
        target: '_blank',
        content: RISK_ACKNOWLEDGEMENT_CONTENT[processingState.risk.reason],
      },
    };
  }

  if (processingState.isSafeFileAvailable && safeHref) {
    return { linkHref, action: { kind: 'open', href: safeHref, target } };
  }

  if (processingState.risk?.kind === 'warning') {
    return {
      linkHref,
      action: {
        kind: 'acknowledge-risk',
        reason: processingState.risk.reason,
        href,
        target: '_blank',
        content: RISK_ACKNOWLEDGEMENT_CONTENT[processingState.risk.reason],
      },
    };
  }

  if (!isFilePreviewable(fileName)) {
    return { linkHref, action: { kind: 'confirm-download', href, target: '_blank' } };
  }

  return { linkHref, action: { kind: 'open', href, target } };
};
