import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatutFilter } from './StatutFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StatutFilter', () => {
  it('lets the user pick a statut via the dropdown checkbox filter', async () => {
    const onChange = vi.fn();

    render(<StatutFilter selectedIds={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nouveau' }));

    expect(onChange).toHaveBeenCalledWith(['NOUVEAU']);
  });
});
