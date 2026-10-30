import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentExportAccessDenied, DocumentExportDownload, DocumentExportLinkExpired } from './DocumentExportPages';

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
});
