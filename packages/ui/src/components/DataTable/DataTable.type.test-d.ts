import type { Column, ColumnKey, NestedKeys, OnSortChangeParams, Row, RowWithId } from './DataTable.types';
import type { OnSortChangeParams as BaseSortParams } from './SortButton/SortButton';

describe('Type‐level tests for ./DataTable.types', () => {
  it('Row accepts primitives, nested Rows, or arrays', () => {
    type SampleRow = {
      foo: number;
      bar: string;
      nested: { baz: boolean };
      list: unknown[];
    };

    // SampleRow should be assignable to our Row
    expectTypeOf<SampleRow>().toMatchTypeOf<Row>();
  });

  it('RowWithId adds a required id key of string|number', () => {
    type WithStringId = RowWithId<'id'> & { foo: number };
    expectTypeOf<WithStringId['id']>().toEqualTypeOf<string | number>();
    expectTypeOf<WithStringId>().toMatchTypeOf<RowWithId<'id'>>();
  });

  it('NestedKeys produces flat keys + dot‐paths', () => {
    type SampleRow = {
      foo: number;
      bar: string;
      nested: { baz: boolean };
      list: unknown[];
    };
    type Keys = NestedKeys<SampleRow>;

    // should include the top‐level primitives...
    expectTypeOf<'foo'>().toMatchTypeOf<Keys>();
    expectTypeOf<'bar'>().toMatchTypeOf<Keys>();
    // ...and the nested path
    expectTypeOf<'nested.baz'>().toMatchTypeOf<Keys>();
    // but NOT array paths
    // @ts-expect-error
    expectTypeOf<'list.0'>().toEqualTypeOf<Keys>();
  });

  it('ColumnKey is either NestedKeys<T> or `custom:${string}`', () => {
    type SampleRow = { foo: number };
    type CK = ColumnKey<SampleRow>;
    expectTypeOf<'foo'>().toMatchTypeOf<CK>();
    expectTypeOf<`custom:anything`>().toMatchTypeOf<CK>();
  });

  it('Column<T> shape matches key, label, and optional flags', () => {
    type SampleRow = { foo: number };
    const col: Column<SampleRow> = {
      key: 'foo',
      label: 'Foo Col',
      isSortable: true,
      isFixedLeft: false,
    };
    expectTypeOf<typeof col>().toEqualTypeOf<Column<SampleRow>>();
  });

  it('OnSortChangeParams<T> aliases BaseSortParams<ColumnKey<T>>', () => {
    type SampleRow = { foo: number };
    type SP = OnSortChangeParams<SampleRow>;
    expectTypeOf<SP>().toEqualTypeOf<BaseSortParams<ColumnKey<SampleRow>>>();
  });
});
