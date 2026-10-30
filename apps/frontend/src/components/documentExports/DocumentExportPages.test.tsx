import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentExportAccessDenied,
  DocumentExportCheckFailed,
  DocumentExportDownload,
  DocumentExportLinkExpired,
} from './DocumentExportPages';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('DocumentExportPages', () => {
  describe('DocumentExportDownload', () => {
    const click = vi.fn();

    beforeEach(() => {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      click.mockReset();
    });

    const renderDownload = () =>
      render(
        <StrictMode>
          <DocumentExportDownload
            downloadUrl="/api/document-exports/export-1/download"
            fileName="export.csv"
            expiresAt="2026-10-26T10:30:00.000Z"
          />
        </StrictMode>,
      );

    it('starts the download once when the page opens (CA3)', () => {
      renderDownload();

      expect(click).toHaveBeenCalledTimes(1);
    });

    it('offers to download the file again (CA7)', () => {
      renderDownload();

      const link = screen.getByRole('link', { name: 'Télécharger le fichier' });
      expect(link).toHaveAttribute('href', '/api/document-exports/export-1/download');
      expect(link).toHaveAttribute('download');
      expect(screen.getByRole('heading', { level: 1, name: 'Téléchargement de votre export' })).toBeInTheDocument();
    });

    it('focuses the title before the download starts, so it is announced', () => {
      let focusedOnClick: Element | null = null;
      click.mockImplementation(() => {
        focusedOnClick = document.activeElement;
      });

      renderDownload();

      expect(focusedOnClick).toBe(screen.getByRole('heading', { level: 1, name: 'Téléchargement de votre export' }));
    });
  });

  it('explains that only the requester can download the file (CA5, CA6)', () => {
    render(<DocumentExportAccessDenied />);

    expect(screen.getByRole('heading', { level: 1, name: 'Accès impossible' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Page d’accueil' })).toHaveAttribute('href', '/');
  });

  it('invites to run a new export once the link expired (CA8)', () => {
    render(<DocumentExportLinkExpired />);

    expect(screen.getByRole('heading', { level: 1, name: 'Ce lien n’est plus valide' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relancer un export' })).toHaveAttribute('href', '/statistiques');
  });

  it('offers to check the link again when the check failed', () => {
    const onRetry = vi.fn();
    render(<DocumentExportCheckFailed onRetry={onRetry} />);

    const title = screen.getByRole('heading', { level: 1, name: 'Vérification impossible' });
    expect(title).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Page d’accueil' })).toHaveAttribute('href', '/');

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
