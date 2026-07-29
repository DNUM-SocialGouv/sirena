import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { DownloadCsvButton } from './DownloadCsvButton';

const card = {
  name: 'Répartition',
  data: {
    cols: [{ name: 'a', display_name: 'A', base_type: 'type/Text', semantic_type: null, source: null }],
    rows: [['x']],
  },
} as unknown as StatisticsCard;

describe('DownloadCsvButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the accessible name "Télécharger au format CSV"', () => {
    render(<DownloadCsvButton card={card} />);
    expect(screen.getByRole('button', { name: 'Télécharger au format CSV' })).toBeInTheDocument();
  });

  it('triggers a CSV download on click and revokes the object URL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<DownloadCsvButton card={card} />);
    await userEvent.click(screen.getByRole('button', { name: 'Télécharger au format CSV' }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/csv');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:card');
  });
});
