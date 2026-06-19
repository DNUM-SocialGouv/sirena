import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExportRequetesButton } from './ExportRequetesButton';

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
    const objectUrl = 'blob:export-requetes';
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let clickedLink: HTMLAnchorElement | undefined;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedLink = this;
    });
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

    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(clickedLink).toMatchObject({
      download: 'export-requetes-sirena-2026-06-18.csv',
      href: objectUrl,
    });
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(objectUrl);
  });
});
