import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DataTable, type DataTableProps } from './DataTable';
import type { Column, OnSortChangeParams } from './DataTable.type';

type MyRow = { id: number; name: string; info: { foo: number }; test: number[] };

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

const description = `
### DataTable

A reusable, fully typed, and accessible table component with:

- Sorting support (per-column)
- Row selection with indeterminate checkbox
- Custom cell renderers
- Fixed-size column support
- Adjustable density and styling

### Generic Types

- \`K\` — the string key used to uniquely identify each row (e.g. \`'id'\`)
- \`T\` — the shape of each row object (i.e., your data type)

---

## Full Example

Here's a complete React example showing selection, sorting (including on \`info.foo\`), and custom cell renderers.

\`\`\`tsx
import React, { useState } from 'react'
import { DataTable } from './DataTable'
import type { Column } from './DataTable.types'
import type { OnSortChangeParams } from './SortButton/SortButton'

// (1) Define your row shape
type MyRow = {
  id: number
  name: string
  info: { foo: number }
  test: number[]
}

// (2) Component
export function FullExample() {
  const [users, setUsers] = useState<MyRow[]>([
    { id: 1,  name: 'Alice',   info: { foo: 123 }, test: [1,2,3] },
    { id: 2,  name: 'Bob',     info: { foo: 456 }, test: [1,2,3] },
    { id: 3,  name: 'Charlie', info: { foo: 789 }, test: [1,2,3] },
    { id: 4,  name: 'Diana',   info: { foo: 101 }, test: [1,2,3] },
    { id: 5,  name: 'Eve',     info: { foo: 202 }, test: [1,2,3] },
    { id: 6,  name: 'Frank',   info: { foo: 303 }, test: [1,2,3] },
    { id: 7,  name: 'Grace',   info: { foo: 404 }, test: [1,2,3] },
    { id: 8,  name: 'Heidi',   info: { foo: 505 }, test: [1,2,3] },
    { id: 9,  name: 'Ivan',    info: { foo: 606 }, test: [1,2,3] },
    { id: 10, name: 'Judy',    info: { foo: 707 }, test: [1,2,3] },
  ])

  const columns: Column<MyRow>[] = [
    { key: 'name',       label: 'Name',            isSortable: true },
    { key: 'info.foo',   label: 'Foo',             isSortable: true },
    { key: 'custom:test',  label: 'Test (comma)' },
    { key: 'custom:test1', label: 'Test (dash)'  },
    { key: 'custom:test2', label: 'Test (pipe)'  },
    { key: 'custom:test3', label: 'Test (sum)'   },
    { key: 'custom:test4', label: 'Test (avg)',   isFixedRight: true },
  ]

  const [selected, setSelected] = useState<number[]>([])
  const [sort, setSort] = useState<OnSortChangeParams<MyRow>>({
    sort: '',
    sortDirection: '',
  })

  // Selection handler
  const handleSelectedChange = (next: number[]) => {
    setSelected(next)
  }

  // Sort handler (works on name, id, info.foo)
  const handleSortChange = (params: OnSortChangeParams<MyRow>) => {
    setSort(params)
    const { sort: key, sortDirection } = params
    const dir = sortDirection === 'asc' ? 1 : -1

    const sorted = [...users].sort((a, b) => {
      switch (key) {
        case 'name':
          return a.name.localeCompare(b.name) * dir
        case 'id':
          return (a.id - b.id) * dir
        case 'info.foo':
          return (a.info.foo - b.info.foo) * dir
        default:
          return 0
      }
    })

    setUsers(sorted)
  }

  // Custom-cell renderers for the \`test\` array
  const cells = {
    'custom:test':  (row: MyRow) => <span>{row.test.join(', ')}</span>,
    'custom:test1': (row: MyRow) => <span>{row.test.join('-')}</span>,
    'custom:test2': (row: MyRow) => <span>{row.test.join(' | ')}</span>,
    'custom:test3': (row: MyRow) => (
      <span>{row.test.reduce((sum, v) => sum + v, 0)}</span>
    ),
    'custom:test4': (row: MyRow) => {
      const sum = row.test.reduce((sum, v) => sum + v, 0)
      const avg = (sum / row.test.length).toFixed(2)
      return <span>{avg}</span>
    },
  }

  return (
    <>
      <div>selected: {JSON.stringify(selected)}</div>
      <div>sort: {JSON.stringify(sort)}</div>

      <DataTable
        title="User Table"
        rowId="id"
        data={users}
        columns={columns}
        cells={cells}
        isSelectable
        selectedValues={selected}
        onSelectedValuesChange={handleSelectedChange}
        sort={sort}
        onSortChange={handleSortChange}
      />
    </>
  )
}
\`\`\`

#### Props

| Prop                      | Type                                                      | Description |
|---------------------------|-----------------------------------------------------------|-------------|
| \`title\`                 | \`string\`                                                | Title shown as the table caption |
| \`id\`                    | \`string?\`                                               | Optional HTML id for DOM reference |
| \`rowId\`                 | \`K\`                                                     | Property key used to uniquely identify each row |
| \`data\`                  | \`T[]\`                                                   | Array of row data |
| \`columns\`               | \`Column<T>[]\`                                           | Column configuration (keys, labels, etc.) |
| \`cells\`                 | \`Partial<Record<ColumnKey<T>, (row: T) => ReactNode>>\`  | Optional map of custom render functions for cells |
| \`size\`                  | \`'sm' | 'md' | 'lg'\`                                   | Controls the table’s row padding and density |
| \`isBordered\`            | \`boolean?\`                                              | Whether the table has visible borders |
| \`isSelectable\`          | \`boolean?\`                                              | Enables row selection with checkboxes |
| \`emptyPlaceholder\`      | \`string?\`                                               | Message shown when \`data\` is empty |
| \`selectedValues\`        | \`T[K][]\`                                                | Controlled selection state based on \`rowId\` |
| \`onSelectedValuesChange\` | \`(selected: T[K][]) => void\`                          | Callback fired when row selection changes |
| \`sort\`                  | \`{ sort: ColumnKey<T> | ''; sortDirection: 'asc' | 'desc' | '' }\` | Current sorting state |
| \`onSortChange\`          | \`(params: { sort: ColumnKey<T>; sortDirection }) => void\` | Callback fired when sorting changes |
`;

const meta: Meta<typeof DataTable<'id', MyRow>> = {
  title: 'Components/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: description,
      },
    },
  },
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

export const fullExample: Story = {
  render: () => {
    const [users, setUsers] = useState<MyRow[]>([
      { id: 1, name: 'Alice', info: { foo: 123 }, test: [1, 2, 3] },
      { id: 2, name: 'Bob', info: { foo: 456 }, test: [1, 2, 3] },
      { id: 3, name: 'Charlie', info: { foo: 789 }, test: [1, 2, 3] },
      { id: 4, name: 'Diana', info: { foo: 101 }, test: [1, 2, 3] },
      { id: 5, name: 'Eve', info: { foo: 202 }, test: [1, 2, 3] },
      { id: 6, name: 'Frank', info: { foo: 303 }, test: [1, 2, 3] },
      { id: 7, name: 'Grace', info: { foo: 404 }, test: [1, 2, 3] },
      { id: 8, name: 'Heidi', info: { foo: 505 }, test: [1, 2, 3] },
      { id: 9, name: 'Ivan', info: { foo: 606 }, test: [1, 2, 3] },
      { id: 10, name: 'Judy', info: { foo: 707 }, test: [1, 2, 3] },
    ]);

    const columns: Column<MyRow>[] = [
      { key: 'name', label: 'Name', isSortable: true },
      { key: 'info.foo', label: 'Foo', isSortable: true },
      { key: 'custom:test', label: 'Test' },
      { key: 'custom:test1', label: 'Test' },
      { key: 'custom:test2', label: 'Test' },
      { key: 'custom:test3', label: 'Test' },
      { key: 'custom:test4', label: 'Test', isFixedRight: true },
    ];

    const [selected, setSelected] = useState<number[]>([]);
    const [sort, setSort] = useState<OnSortChangeParams<MyRow>>({ sort: '', sortDirection: '' });

    const handleSelectedChange = (next: number[]) => {
      setSelected(next);
    };

    const handleSortChange = (params: OnSortChangeParams<MyRow>) => {
      setSort(params);
      const { sort: key, sortDirection } = params;
      const dir = sortDirection === 'asc' ? 1 : -1;

      const newUsers = [...users].sort((a, b) => {
        switch (key) {
          case 'name':
            return a.name.localeCompare(b.name) * dir;
          case 'id':
            // assuming id is number
            return ((a.id as number) - (b.id as number)) * dir;
          case 'info.foo':
            return (a.info.foo - b.info.foo) * dir;
          default:
            return 0;
        }
      });

      setUsers(newUsers);
    };

    const cells = {
      'custom:test': (row: MyRow) => <span>{row.test.join(', ')}</span>,
      'custom:test1': (row: MyRow) => <span>{row.test.join('-')}</span>,
      'custom:test2': (row: MyRow) => <span>{row.test.join(' | ')}</span>,
      'custom:test3': (row: MyRow) => <span>{row.test.reduce((sum, v) => sum + Number(v), 0)}</span>,
      'custom:test4': (row: MyRow) => {
        const sum = row.test.reduce((sum, v) => sum + Number(v), 0);
        const avg = (sum / row.test.length).toFixed(2);
        return <span>{avg}</span>;
      },
    };

    return (
      <>
        <div>selected: {JSON.stringify(sort)}</div>
        <div>sort: {JSON.stringify(selected)}</div>

        <DataTable
          title="titre"
          rowId="id"
          data={users}
          columns={columns}
          onSortChange={handleSortChange}
          sort={sort}
          selectedValues={selected}
          isSelectable
          onSelectedValuesChange={handleSelectedChange}
          cells={cells}
        />
      </>
    );
  },
};
