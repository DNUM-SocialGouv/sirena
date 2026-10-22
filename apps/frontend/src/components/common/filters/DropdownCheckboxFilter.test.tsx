import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

const selectedValuesLabel = (count: number) =>
  `entité${count > 1 ? 's' : ''} administrative${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;

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
        selectedValuesLabel={selectedValuesLabel}
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

  it('lets a parent update its state when the dropdown opens and closes, without a render-phase update', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const Parent = () => {
      const [isOpen, setIsOpen] = useState(false);
      const handleOpen = useCallback(() => setIsOpen(true), []);
      const handleClose = useCallback(() => setIsOpen(false), []);
      return (
        <>
          <p>{isOpen ? 'parent: ouvert' : 'parent: fermé'}</p>
          <DropdownCheckboxFilter
            buttonLabel="Statut"
            selectedValuesLabel={selectedValuesLabel}
            legend="Filtrer par statut"
            options={[{ value: 'CLOTUREE', label: 'Clôturée' }]}
            selectedValues={[]}
            onChange={vi.fn()}
            onOpen={handleOpen}
            onClose={handleClose}
          />
        </>
      );
    };

    render(<Parent />);

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));
    expect(screen.getByText('parent: ouvert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Statut' }));
    expect(screen.getByText('parent: fermé')).toBeInTheDocument();

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('Cannot update a component'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    consoleError.mockRestore();
  });
});
