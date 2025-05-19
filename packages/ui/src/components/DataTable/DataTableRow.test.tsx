import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTableRow } from './DataTableRow';

describe('DataTableRow Component', () => {
  const mockRow = { id: 1, name: 'Alice', age: 30 };
  const mockColumns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'custom:age' as const, label: 'Age', isFixedRight: true },
  ];

  const getCell = vi.fn((row, key) => {
    if (key === 'name') return row.name;
    if (key === 'custom:age') return row.age;
    return '—';
  });

  const defaultProps = {
    row: mockRow,
    rowIndex: 0,
    rowId: 'id' as const,
    id: 'table-1',
    selected: false,
    onToggleSelect: vi.fn(),
    columns: mockColumns,
    getCell,
  };

  it('renders a table row with checkbox and data cells', () => {
    render(
      <table>
        <tbody>
          <DataTableRow {...defaultProps} />
        </tbody>
      </table>,
    );

    // checkbox
    expect(screen.getByLabelText('Sélectionner la ligne 1')).toBeInTheDocument();

    // content
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('calls onToggleSelect when checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(
      <table>
        <tbody>
          <DataTableRow {...defaultProps} />
        </tbody>
      </table>,
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(defaultProps.onToggleSelect).toHaveBeenCalledTimes(1);
    expect(defaultProps.onToggleSelect).toHaveBeenCalledWith(1);
  });

  it('sets aria-selected correctly based on `selected` prop', () => {
    const { container } = render(
      <table>
        <tbody>
          <DataTableRow {...defaultProps} selected={true} />
        </tbody>
      </table>,
    );

    const row = container.querySelector('tr');
    expect(row).toHaveAttribute('aria-selected', 'true');
  });
});
