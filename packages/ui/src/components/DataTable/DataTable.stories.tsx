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

### Example

#### Given a row type:
\`\`\`ts
type User = {
  id: number;
  name: string;
  info: { foo: number };
  tags: string[];
};
\`\`\`

#### You would use:
\`\`\`tsx
<DataTable<'id', User>
  rowId=\"id\"
  data={[
    { id: 1, name: 'Alice', info: { foo: 123 }, tags: ['admin'] },
    { id: 2, name: 'Bob', info: { foo: 456 }, tags: ['user'] },
  ]}
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'info.foo', label: 'Foo', isSortable: true },
    { key: 'custom:tags', label: 'Tags' },
  ]}
  selectedValues={[1, 2]} // array of T[K] = User['id']
  onSelectedValuesChange={(ids) => console.log(ids)}
  sort={{ sort: 'info.foo', sortDirection: 'asc' }}
  onSortChange={(s) => console.log(s)}
/>
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

const meta: Meta<typeof MyDataTable> = {
  title: 'Components/DataTable',
  component: MyDataTable,
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
