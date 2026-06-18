import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExportRequetesButton } from './ExportRequetesButton';

describe('ExportRequetesButton', () => {
  it('renders the export action', () => {
    render(<ExportRequetesButton />);

    expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toBeInTheDocument();
  });
});
