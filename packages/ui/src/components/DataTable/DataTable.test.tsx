import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';

vi.mock('./DataTableHeader/DataTableHeader', () => ({
  DataTableHeader: () => (
    <thead>
      <tr>
        <th>Mock Header</th>
      </tr>
    </thead>
  ),
}));

vi.mock('./DataTableRow/DataTableRow', () => ({
  DataTableRow: ({ row }: { row: { id: number } }) => (
    <tr>
      <td>Row {row.id}</td>
    </tr>
  ),
}));

vi.mock('../Loader/Loader', () => ({
  Loader: ({ size }: { size?: string }) => (
    <div data-testid="loader" data-size={size}>
      Loading...
    </div>
  ),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('DataTable Component', () => {
  const data = [
    { id: 1, name: 'Alice', info: { foo: 123 } },
    { id: 2, name: 'Bob', info: { foo: 456 } },
  ];

  const columns = [
    { key: 'name' as const, label: 'Name', isSortable: true },
    { key: 'info.foo' as const, label: 'Foo', isSortable: true },
  ];

  it('renders the table with caption and mocked header/rows', () => {
    const id = 'test-table';
    render(<DataTable title="User Table" rowId="id" id={id} data={data} columns={columns} />);

    expect(screen.getByText('User Table')).toBeInTheDocument(); // caption
    expect(screen.getByText('Mock Header')).toBeInTheDocument();
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 2')).toBeInTheDocument();
  });

  it('renders empty placeholder if no data is provided', () => {
    type Data = typeof data;
    const emptyData: Data = [];
    const id = 'test-table';
    render(
      <DataTable
        title="Empty Table"
        rowId="id"
        id={id}
        data={emptyData}
        columns={columns}
        emptyPlaceholder="Nothing here"
      />,
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows loader when isLoading is true', () => {
    const id = 'test-table';
    render(<DataTable title="User Table" rowId="id" id={id} data={data} columns={columns} isLoading={true} />);

    const loader = screen.getByTestId('loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-size', 'sm');
  });

  it('does not show loader when isLoading is false', () => {
    const id = 'test-table';
    render(<DataTable title="User Table" rowId="id" id={id} data={data} columns={columns} isLoading={false} />);

    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });

  it('does not show loader when isLoading is not provided', () => {
    const id = 'test-table';
    render(<DataTable title="User Table" rowId="id" id={id} data={data} columns={columns} />);

    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });
});
