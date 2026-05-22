import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DropdownCheckboxFilter', () => {
  it('opens options and calls onChange with selected values', async () => {
    const onChange = vi.fn();

    render(
      <DropdownCheckboxFilter
        buttonLabel="Entité administrative"
        legend="Filtrer les entités par entité administrative"
        hintText="Entité administrative"
        options={[
          { value: 'root-ars', label: 'ARS Normandie' },
          { value: 'root-cd', label: 'CD Calvados' },
        ]}
        selectedValues={[]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Entité administrative' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'ARS Normandie' }));

    expect(onChange).toHaveBeenCalledWith(['root-ars']);
  });
});
