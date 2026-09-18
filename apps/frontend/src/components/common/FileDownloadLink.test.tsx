import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { FileDownloadLink } from './FileDownloadLink';

let pushStatus: ((status: FileProcessingStatus) => void) | null = null;
const discloseModal = vi.fn();
const concealModal = vi.fn();
const dsfr = vi.fn((_element: HTMLElement | null) => ({
  modal: { disclose: discloseModal, conceal: concealModal },
}));

vi.mock('@/hooks/useFileProcessingStatus', async () => {
  const { useState } = await import('react');
  return {
    useFileProcessingStatus: ({ initialStatus }: { initialStatus: FileProcessingStatus | null }) => {
      const [status, setStatus] = useState(initialStatus);
      pushStatus = setStatus;
      return status;
    },
  };
});

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null);
  Object.defineProperty(window, 'dsfr', {
    configurable: true,
    writable: true,
    value: dsfr,
  });
});

afterEach(() => {
  cleanup();
  pushStatus = null;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

type FileDownloadLinkProps = Parameters<typeof FileDownloadLink>[0];

const renderLink = (props: Partial<FileDownloadLinkProps> = {}) =>
  render(<FileDownloadLink href="/api/files/1" fileId="file-1" fileName="rapport.pdf" {...props} />);

describe('FileDownloadLink download decision', () => {
  it('opens the infected-file risk modal before using an available safe version', async () => {
    renderLink({
      safeHref: '/api/files/1/safe',
      status: 'READY',
      scanStatus: 'INFECTED',
      sanitizeStatus: 'COMPLETED',
    });

    await userEvent.click(screen.getByRole('link', { name: /rapport\.pdf/ }));

    expect(window.open).not.toHaveBeenCalled();
    expect(dsfr.mock.calls[0][0]?.id).toContain('risk-modal');
    expect(discloseModal).toHaveBeenCalledOnce();
  });

  it('opens the safe version directly before showing another processing warning', async () => {
    renderLink({
      safeHref: '/api/files/1/safe',
      target: 'preview',
      status: 'PROCESSING',
      scanStatus: 'PENDING',
      sanitizeStatus: 'COMPLETED',
    });

    const link = screen.getByRole('link', { name: /rapport\.pdf/ });
    expect(link).toHaveAttribute('href', '/api/files/1/safe');

    await userEvent.click(link);

    expect(window.open).toHaveBeenCalledWith('/api/files/1/safe', 'preview');
    expect(discloseModal).not.toHaveBeenCalled();
  });

  it('opens the processing-warning modal before checking the file format', async () => {
    renderLink({
      fileName: 'archive.zip',
      status: 'PROCESSING',
      scanStatus: 'CLEAN',
      sanitizeStatus: 'PENDING',
    });

    await userEvent.click(screen.getByRole('link', { name: /archive\.zip/ }));

    expect(window.open).not.toHaveBeenCalled();
    expect(dsfr.mock.calls[0][0]?.id).toContain('warning-modal');
    expect(discloseModal).toHaveBeenCalledOnce();
  });

  it('opens the classic confirmation for a non-previewable file', async () => {
    renderLink({
      fileName: 'archive.zip',
      status: 'READY',
      scanStatus: 'CLEAN',
      sanitizeStatus: 'NOT_APPLICABLE',
    });

    await userEvent.click(screen.getByRole('link', { name: /archive\.zip/ }));

    expect(window.open).not.toHaveBeenCalled();
    expect(dsfr.mock.calls[0][0]?.id).toContain('download-modal');
    expect(discloseModal).toHaveBeenCalledOnce();
  });

  it('opens an ordinary previewable file directly', async () => {
    renderLink({
      target: 'preview',
      status: 'READY',
      scanStatus: 'CLEAN',
      sanitizeStatus: 'NOT_APPLICABLE',
    });

    await userEvent.click(screen.getByRole('link', { name: /rapport\.pdf/ }));

    expect(window.open).toHaveBeenCalledWith('/api/files/1', 'preview');
    expect(discloseModal).not.toHaveBeenCalled();
  });
});

describe('FileDownloadLink status badge', () => {
  it('describes the file link with its processing status', () => {
    renderLink({ status: 'READY', scanStatus: 'CLEAN', sanitizeStatus: 'COMPLETED' });

    const link = screen.getByRole('link', { name: /rapport\.pdf/ });
    const describedBy = link.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const status = document.getElementById(describedBy as string);
    expect(status).toHaveTextContent('Statut du fichier : Analysé et sécurisé');
  });

  it('keeps the same live region node when the status changes', () => {
    renderLink({ status: 'PENDING', scanStatus: 'SCANNING', sanitizeStatus: 'PENDING' });

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(within(liveRegion).getByText(/Analyse antivirus en cours/)).toBeInTheDocument();

    act(() => {
      pushStatus?.({
        id: 'file-1',
        status: 'READY',
        scanStatus: 'INFECTED',
        sanitizeStatus: 'ERROR',
        processingError: null,
        safeFilePath: null,
      });
    });

    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(within(liveRegion).getByText(/Risque détecté par l'antivirus/)).toBeInTheDocument();
  });
});
