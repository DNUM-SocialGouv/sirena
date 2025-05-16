import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable } from './DataTable';
import type { DataTableProps } from './DataTable';

type MyRow = { id: number; name: string; info: { foo: number }; test: number[] };

const MyDataTable = (props: DataTableProps<'id', MyRow>) => <DataTable<'id', MyRow> {...props} />;

const mockColumns: DataTableProps<'id', MyRow>['columns'] = [
  { key: 'name', label: 'Name', isSortable: true },
  { key: 'info.foo', label: 'Foo', isSortable: true },
  { key: 'custom:test', label: 'Test', isSortable: true },
  { key: 'custom:test1', label: 'Test' },
  { key: 'custom:test2', label: 'Test' },
  { key: 'custom:test3', label: 'Test' },
  { key: 'custom:test4', label: 'Test', isFixedRight: true },
];

const mockData: MyRow[] = [
  { id: 1, name: 'Alice', info: { foo: 123 }, test: [1, 2, 3] },
  { id: 2, name: 'Bob', info: { foo: 456 }, test: [1, 2, 3] },
];

const mockCells: DataTableProps<'id', MyRow>['cells'] = {
  name: (row) => <strong>{row.name}</strong>,
  ...['test', 'test1', 'test2', 'test3', 'test4'].reduce(
    (acc, key) => {
      if (acc) {
        acc[`custom:${key}`] = (row: MyRow) => <span>{row.test}</span>;
      }
      return acc;
    },
    {} as Partial<DataTableProps<'id', MyRow>['cells']>,
  ),
};

const meta: Meta<typeof MyDataTable> = {
  title: 'Components/DataTable',
  component: MyDataTable,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md', 'lg'],
      description: 'Controls the size of the table',
      defaultValue: 'md',
    },
    isSelectable: {
      control: 'boolean',
      description: 'Enables row selection with checkboxes',
      defaultValue: true,
    },
    sort: {
      name: 'Sort Column',
      control: { type: 'select' },
      options: [
        'none',
        ...mockColumns.flatMap((column) =>
          column.isSortable
            ? ['', 'asc', 'desc'].map((sortDirection) => `${column.key}:${sortDirection || 'none'}`)
            : [],
        ),
      ],
      mapping: {
        none: { sort: '', sortDirection: '' },
        ...Object.fromEntries(
          mockColumns.flatMap((column) =>
            column.isSortable
              ? ['', 'asc', 'desc'].map((dir) => {
                  const key = `${column.key}:${dir || 'none'}`;
                  return [key, { sort: column.key, sortDirection: dir as 'asc' | 'desc' | '' }];
                })
              : [],
          ),
        ),
      },
      labels: {
        none: 'No sorting',
        ...Object.fromEntries(
          mockColumns.flatMap((column) =>
            column.isSortable
              ? ['', 'asc', 'desc'].map((dir) => {
                  const key = `${column.key}:${dir || 'none'}`;
                  const label = `${column.label} ${dir ? `(${dir})` : '(none)'}`;
                  return [key, label];
                })
              : [],
          ),
        ),
      },
    },
    cells: {
      control: false,
      description:
        'An optional map of custom render functions for individual columns. Each key should match a column `key`, and the value should be a function that takes a row and returns a ReactNode. Useful for rendering complex content like formatted values, icons, or components.',
    },
    data: {
      description: 'Array of row data to display',
    },
    onSortChange: {
      action: 'onSortChange',
      description: 'Callback fired when sorting changes',
    },
    columns: {
      description: 'Column definitions including key and label',
    },
    selectedValues: {
      description:
        'An array of selected row identifiers (based on the `rowId` field). This makes the table controlled for selection. To update it, use the `onSelectedValuesChange` callback.',
    },
    onSelectedValuesChange: {
      action: 'onSelectedValuesChange',
      description:
        'Callback fired when the user selects or deselects a row. Receives the full updated array of selected row identifiers.',
    },
  },
};
export default meta;

type Story = StoryObj<DataTableProps<'id', MyRow>>;

export const Default: Story = {
  render: (args) => {
    const [selected, setSelected] = useState<number[]>(args.selectedValues || []);

    const handleSelectedChange = (next: number[]) => {
      setSelected(next);
      args.onSelectedValuesChange?.(next); // ✅ forward to Storybook action
    };

    return <DataTable {...args} selectedValues={selected} onSelectedValuesChange={handleSelectedChange} />;
  },
  args: {
    title: 'A table',
    id: 'my-table',
    rowId: 'id',
    isSelectable: true,
    selectedValues: [],
    columns: mockColumns,
    data: mockData,
    cells: mockCells,
  },
};
