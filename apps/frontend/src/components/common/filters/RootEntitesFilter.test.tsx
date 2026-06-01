import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RootEntitesFilter } from './RootEntitesFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RootEntitesFilter', () => {
  it('renders root entites as administrative entity filter options', async () => {
    const onChange = vi.fn();

    render(
      <RootEntitesFilter
        rootEntites={[
          { id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR' },
          { id: 'root-cd', nomComplet: 'CD Calvados', label: 'CD 14' },
        ]}
        selectedRootEntiteIds={[]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Entité administrative' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'ARS Normandie' }));

    expect(onChange).toHaveBeenCalledWith(['root-ars']);
  });
});
