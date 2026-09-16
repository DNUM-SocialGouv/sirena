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
