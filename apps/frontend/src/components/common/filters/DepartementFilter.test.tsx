import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DepartementFilter } from './DepartementFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DepartementFilter', () => {
  it('uses the generic dropdown checkbox filter behavior', async () => {
    const onChange = vi.fn();

    render(
      <DepartementFilter
        departements={[{ code: '14', label: 'Calvados' }]}
        selectedCodes={[]}
        counts={{ '14': 3 }}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Département' }));
    await userEvent.click(screen.getByRole('checkbox', { name: '14 - Calvados (3)' }));

    expect(onChange).toHaveBeenCalledWith(['14']);
  });
});
