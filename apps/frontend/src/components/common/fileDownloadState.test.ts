import { describe, expect, it } from 'vitest';
import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { getFileProcessingState } from './fileDownloadState';

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
