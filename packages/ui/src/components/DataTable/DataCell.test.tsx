import { render, screen } from '@testing-library/react';
import { DataCell } from './DataCell';

describe('DataCell Component', () => {
  const mockRow = { id: 1, name: 'alice' };
  const getCell = vi.fn((row: typeof mockRow) => row.name.toUpperCase());

  it('renders the cell with the correct content', () => {
    render(<DataCell row={mockRow} column={{ key: 'name', label: 'Name' }} getCell={getCell} />);
    expect(getCell).toHaveBeenCalledWith(mockRow, 'name');
    expect(screen.getByText('ALICE')).toBeInTheDocument();
  });
});
