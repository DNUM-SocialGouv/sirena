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
});
