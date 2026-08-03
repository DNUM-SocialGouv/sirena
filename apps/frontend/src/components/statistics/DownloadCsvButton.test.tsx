import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { mockBrowserDownload } from '@/test-utils/mockBrowserDownload';
import { DownloadCsvButton } from './DownloadCsvButton';

const card = {
  name: 'Répartition',
  data: {
    cols: [{ name: 'a', display_name: 'A', base_type: 'type/Text', semantic_type: null, source: null }],
    rows: [['x']],
  },
} as unknown as StatisticsCard;

const label = 'Télécharger le tableau « Répartition » au format CSV';

describe('DownloadCsvButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes a per-card accessible name mentioning the table', () => {
    render(<DownloadCsvButton card={card} />);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('triggers a CSV download on click and revokes the object URL', async () => {
    const browserDownload = mockBrowserDownload('blob:card');

    render(<DownloadCsvButton card={card} />);
    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(browserDownload.createObjectURLSpy).toHaveBeenCalledOnce();
    const [blob] = browserDownload.createObjectURLSpy.mock.calls[0] as [Blob];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/csv');
    expect(browserDownload.clickSpy).toHaveBeenCalledOnce();
    expect(browserDownload.revokeObjectURLSpy).toHaveBeenCalledWith(browserDownload.objectUrl);
  });
});
