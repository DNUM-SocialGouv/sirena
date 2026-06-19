import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExportRequetesButton } from './ExportRequetesButton';

function mockBrowserDownload(objectUrl = 'blob:export-requetes') {
  const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  let clickedLink: HTMLAnchorElement | undefined;
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clickedLink = this;
  });

  return {
    clickSpy,
    createObjectURLSpy,
    get clickedLink() {
      return clickedLink;
    },
    objectUrl,
    revokeObjectURLSpy,
  };
}

describe('ExportRequetesButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the export action', () => {
    render(<ExportRequetesButton />);

    expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toBeInTheDocument();
  });

  it('disables the button and shows loading text while the export is running', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));

    render(<ExportRequetesButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));

    expect(screen.getByRole('button', { name: 'Export en cours…' })).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith('/api/statistics/export-requetes');
  });

  it('downloads the exported CSV with the response filename', async () => {
    const csv = 'Numéro de requête;Statut\n2026-05-RS1;Clôturée\n';
    const browserDownload = mockBrowserDownload();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(csv, {
        headers: {
          'Content-Disposition': 'attachment; filename="export-requetes-sirena-2026-06-18.csv"',
          'Content-Type': 'text/csv; charset=utf-8',
        },
      }),
    );

    render(<ExportRequetesButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));

    expect(browserDownload.createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(browserDownload.clickSpy).toHaveBeenCalledOnce();
    expect(browserDownload.clickedLink).toMatchObject({
      download: 'export-requetes-sirena-2026-06-18.csv',
      href: browserDownload.objectUrl,
    });
    expect(browserDownload.revokeObjectURLSpy).toHaveBeenCalledWith(browserDownload.objectUrl);
  });

  it('downloads the exported CSV with a fallback filename when the response has no filename', async () => {
    const browserDownload = mockBrowserDownload();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Numéro de requête\n'));

    render(<ExportRequetesButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));

    expect(browserDownload.clickedLink).toMatchObject({
      download: 'export-requetes-sirena.csv',
      href: browserDownload.objectUrl,
    });
  });

  it('cleans up the object URL and shows an error when triggering the download fails', async () => {
    const objectUrl = 'blob:export-requetes';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('Download failed');
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Numéro de requête\n'));

    render(<ExportRequetesButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));

    expect(revokeObjectURLSpy).toHaveBeenCalledWith(objectUrl);
    expect(screen.getByRole('alert')).toHaveTextContent("L'export des requêtes a échoué. Veuillez réessayer.");
  });

  it('shows an error and re-enables the button when the export request cannot be completed', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<ExportRequetesButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("L'export des requêtes a échoué. Veuillez réessayer.");
    expect(alert).toHaveClass('fr-alert--error');
    expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toBeEnabled();
  });

  it('shows an error and re-enables the button when the export fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    render(<ExportRequetesButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("L'export des requêtes a échoué. Veuillez réessayer.");
    expect(alert).toHaveClass('fr-alert--error');
    expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toBeEnabled();
  });
});
