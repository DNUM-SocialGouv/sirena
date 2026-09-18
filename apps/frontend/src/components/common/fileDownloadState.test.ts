import { describe, expect, it } from 'vitest';
import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { getFileDownloadState, getFileProcessingState } from './fileDownloadState';

const fileStatus = (scanStatus: string, sanitizeStatus: string): FileProcessingStatus => ({
  id: 'file-1',
  status: 'PROCESSING',
  scanStatus,
  sanitizeStatus,
  processingError: null,
  safeFilePath: null,
});

describe('getFileProcessingState', () => {
  it.each([
    { status: null, isComplete: false, isSafeFileAvailable: false },
    { status: fileStatus('CLEAN', 'COMPLETED'), isComplete: true, isSafeFileAvailable: true },
    { status: fileStatus('INFECTED', 'ERROR'), isComplete: true, isSafeFileAvailable: false },
    { status: fileStatus('ERROR', 'SKIPPED'), isComplete: true, isSafeFileAvailable: false },
    { status: fileStatus('SKIPPED', 'NOT_APPLICABLE'), isComplete: true, isSafeFileAvailable: false },
    { status: fileStatus('SCANNING', 'SANITIZING'), isComplete: false, isSafeFileAvailable: false },
    { status: fileStatus('UNKNOWN', 'COMPLETED'), isComplete: false, isSafeFileAvailable: true },
    { status: fileStatus('CLEAN', 'UNKNOWN'), isComplete: false, isSafeFileAvailable: false },
  ])('derives lifecycle flags from $status', ({ status, isComplete, isSafeFileAvailable }) => {
    expect(getFileProcessingState(status)).toMatchObject({ isComplete, isSafeFileAvailable });
  });

  it.each([
    { status: null, expected: null },
    {
      status: fileStatus('PENDING', 'COMPLETED'),
      expected: {
        label: "En attente d'analyse antivirus",
        iconId: 'fr-icon-time-fill',
        tone: 'intermediate',
      },
    },
    {
      status: fileStatus('SCANNING', 'PENDING'),
      expected: {
        label: 'Analyse antivirus en cours',
        iconId: 'fr-icon-refresh-fill',
        tone: 'intermediate',
      },
    },
    {
      status: fileStatus('SKIPPED', 'NOT_APPLICABLE'),
      expected: {
        label: "Non analysé par l'antivirus",
        iconId: 'fr-icon-question-fill',
        tone: 'intermediate',
      },
    },
    {
      status: fileStatus('ERROR', 'ERROR'),
      expected: {
        label: 'Analyse antivirus échouée',
        iconId: 'fr-icon-error-warning-fill',
        tone: 'error',
      },
    },
    {
      status: fileStatus('INFECTED', 'COMPLETED'),
      expected: {
        label: "Risque détecté par l'antivirus",
        iconId: 'fr-icon-warning-fill',
        tone: 'error',
      },
    },
    {
      status: fileStatus('CLEAN', 'PENDING'),
      expected: {
        label: 'En attente de sécurisation',
        iconId: 'fr-icon-time-fill',
        tone: 'intermediate',
      },
    },
    {
      status: fileStatus('CLEAN', 'SANITIZING'),
      expected: {
        label: 'Sécurisation en cours',
        iconId: 'fr-icon-refresh-fill',
        tone: 'intermediate',
      },
    },
    {
      status: fileStatus('CLEAN', 'ERROR'),
      expected: {
        label: 'Sécurisation échouée',
        iconId: 'fr-icon-error-warning-fill',
        tone: 'error',
      },
    },
    {
      status: fileStatus('CLEAN', 'COMPLETED'),
      expected: {
        label: 'Analysé et sécurisé',
        iconId: 'fr-icon-checkbox-circle-fill',
        tone: 'valid',
      },
    },
    {
      status: fileStatus('CLEAN', 'SKIPPED'),
      expected: {
        label: 'Analysé, aucun risque détecté',
        iconId: 'fr-icon-checkbox-circle-fill',
        tone: 'valid',
      },
    },
    {
      status: fileStatus('CLEAN', 'NOT_APPLICABLE'),
      expected: {
        label: 'Analysé, aucun risque détecté',
        iconId: 'fr-icon-checkbox-circle-fill',
        tone: 'valid',
      },
    },
    { status: fileStatus('UNKNOWN', 'UNKNOWN'), expected: null },
  ])('derives the visible status from $status', ({ status, expected }) => {
    expect(getFileProcessingState(status).status).toEqual(expected);
  });

  it.each([
    { status: null, expected: null },
    { status: fileStatus('CLEAN', 'COMPLETED'), expected: null },
    { status: fileStatus('INFECTED', 'PENDING'), expected: { kind: 'infected', reason: 'infected' } },
    { status: fileStatus('PENDING', 'ERROR'), expected: { kind: 'warning', reason: 'scan_pending' } },
    { status: fileStatus('SCANNING', 'SANITIZING'), expected: { kind: 'warning', reason: 'scan_pending' } },
    { status: fileStatus('ERROR', 'PENDING'), expected: { kind: 'warning', reason: 'scan_failed' } },
    { status: fileStatus('SKIPPED', 'ERROR'), expected: { kind: 'warning', reason: 'scan_failed' } },
    { status: fileStatus('CLEAN', 'PENDING'), expected: { kind: 'warning', reason: 'sanitize_pending' } },
    { status: fileStatus('CLEAN', 'SANITIZING'), expected: { kind: 'warning', reason: 'sanitize_pending' } },
    { status: fileStatus('CLEAN', 'ERROR'), expected: { kind: 'warning', reason: 'sanitize_failed' } },
    { status: fileStatus('CLEAN', 'SKIPPED'), expected: null },
  ])('derives the highest-priority risk from $status', ({ status, expected }) => {
    expect(getFileProcessingState(status).risk).toEqual(expected);
  });
});

describe('getFileDownloadState', () => {
  it.each([
    {
      name: 'infected file before an available safe version',
      status: fileStatus('INFECTED', 'COMPLETED'),
      fileName: 'rapport.pdf',
      safeHref: '/files/safe',
      expected: { kind: 'acknowledge-risk', reason: 'infected', href: '/files/original', target: '_blank' },
    },
    {
      name: 'available safe version before another warning',
      status: fileStatus('PENDING', 'COMPLETED'),
      fileName: 'rapport.pdf',
      safeHref: '/files/safe',
      expected: { kind: 'open', href: '/files/safe', target: 'preview' },
    },
    {
      name: 'processing warning before file format',
      status: fileStatus('CLEAN', 'PENDING'),
      fileName: 'archive.zip',
      safeHref: undefined,
      expected: { kind: 'acknowledge-risk', reason: 'sanitize_pending', href: '/files/original', target: '_blank' },
    },
    {
      name: 'classic confirmation for a non-previewable file',
      status: fileStatus('CLEAN', 'NOT_APPLICABLE'),
      fileName: 'archive.zip',
      safeHref: undefined,
      expected: { kind: 'confirm-download', href: '/files/original', target: '_blank' },
    },
    {
      name: 'direct original-file opening',
      status: fileStatus('CLEAN', 'NOT_APPLICABLE'),
      fileName: 'rapport.pdf',
      safeHref: undefined,
      expected: { kind: 'open', href: '/files/original', target: 'preview' },
    },
  ])('chooses $name', ({ status, fileName, safeHref, expected }) => {
    const decision = getFileDownloadState({
      processingState: getFileProcessingState(status),
      fileName,
      href: '/files/original',
      safeHref,
      target: 'preview',
    });

    expect(decision.action).toMatchObject(expected);
  });

  it.each([
    {
      status: fileStatus('INFECTED', 'COMPLETED'),
      safeHref: '/files/safe',
      expected: '/files/safe',
    },
    {
      status: fileStatus('CLEAN', 'COMPLETED'),
      safeHref: undefined,
      expected: '/files/original',
    },
  ])('selects $expected as the link href', ({ status, safeHref, expected }) => {
    const decision = getFileDownloadState({
      processingState: getFileProcessingState(status),
      fileName: 'rapport.pdf',
      href: '/files/original',
      safeHref,
      target: '_blank',
    });

    expect(decision.linkHref).toBe(expected);
  });

  it.each([
    ['rapport.PDF', 'open'],
    ['photo.jpg', 'open'],
    ['photo.JPEG', 'open'],
    ['image.png', 'open'],
    ['animation.gif', 'open'],
    ['image.webp', 'open'],
    ['schema.svg', 'open'],
    ['notes.TXT', 'open'],
    ['archive.zip', 'confirm-download'],
    ['README', 'confirm-download'],
  ])('chooses $expected for the $fileName format', (fileName, expected) => {
    const decision = getFileDownloadState({
      processingState: getFileProcessingState(null),
      fileName,
      href: '/files/original',
      target: '_blank',
    });

    expect(decision.action.kind).toBe(expected);
  });

  it.each([
    {
      status: fileStatus('INFECTED', 'ERROR'),
      expected: {
        title: 'Attention : fichier potentiellement dangereux',
        message:
          'Une menace potentielle a été détectée dans ce fichier. Nous vous recommandons fortement de ne pas télécharger ce fichier. Si vous choisissez de continuer, assurez-vous que votre logiciel antivirus est à jour.',
        confirmLabel: 'Télécharger malgré le risque',
        severity: 'error',
      },
    },
    {
      status: fileStatus('PENDING', 'PENDING'),
      expected: {
        title: 'Analyse en cours',
        message:
          "L'analyse antivirus de ce fichier n'est pas encore terminée. Nous vous recommandons d'attendre la fin de l'analyse avant de télécharger ce fichier.",
        confirmLabel: 'Télécharger le fichier original',
        severity: 'warning',
      },
    },
    {
      status: fileStatus('ERROR', 'SKIPPED'),
      expected: {
        title: 'Analyse non effectuée',
        message:
          "L'analyse antivirus de ce fichier a échoué ou n'a pas pu être effectuée. Le fichier n'a pas été vérifié et peut présenter des risques.",
        confirmLabel: 'Télécharger le fichier original',
        severity: 'warning',
      },
    },
    {
      status: fileStatus('CLEAN', 'SANITIZING'),
      expected: {
        title: 'Sécurisation en cours',
        message:
          "La sécurisation de ce fichier n'est pas encore terminée. Nous vous recommandons d'attendre la fin de la sécurisation pour télécharger une version sûre du fichier.",
        confirmLabel: 'Télécharger le fichier original',
        severity: 'warning',
      },
    },
    {
      status: fileStatus('CLEAN', 'ERROR'),
      expected: {
        title: 'Sécurisation échouée',
        message:
          "La sécurisation de ce fichier a échoué. Le fichier original n'a pas pu être nettoyé et peut contenir des éléments potentiellement dangereux.",
        confirmLabel: 'Télécharger le fichier original',
        severity: 'warning',
      },
    },
  ])('provides the exact acknowledgement content for $status', ({ status, expected }) => {
    const decision = getFileDownloadState({
      processingState: getFileProcessingState(status),
      fileName: 'rapport.pdf',
      href: '/files/original',
      target: '_blank',
    });

    expect(decision.action).toMatchObject({ kind: 'acknowledge-risk', content: expected });
  });
});
