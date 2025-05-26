import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTableHeader } from './DataTableHeader';

describe('DataTableHeader Component', () => {
  const columns = [
    { key: 'name', label: 'Name', isSortable: true },
    { key: 'info.foo', label: 'Foo' },
    { key: 'custom:bar', label: 'Bar', isFixedRight: true },
  ];

  const defaultProps = {
    id: 'table-1',
    isSelectable: true,
    allSelected: false,
    isIndeterminate: false,
    columns,
    sort: { sort: '', sortDirection: '' } as const,
    onToggleAll: vi.fn(),
    onSortChange: vi.fn(),
  };

  it('renders the select-all checkbox and label when selectable', () => {
    render(
      <table>
        <DataTableHeader {...defaultProps} />
      </table>,
    );
    expect(screen.getByLabelText('Sélectionner toutes les lignes')).toBeInTheDocument();
  });

  it('calls onToggleAll when the select-all checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggleAll = vi.fn();

    render(
      <table>
        <DataTableHeader {...defaultProps} onToggleAll={onToggleAll} />
      </table>,
    );
    await user.click(screen.getByRole('checkbox'));
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it('renders column headers with correct labels', () => {
    render(
      <table>
        <DataTableHeader {...defaultProps} />
      </table>,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Foo')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
  });
});
