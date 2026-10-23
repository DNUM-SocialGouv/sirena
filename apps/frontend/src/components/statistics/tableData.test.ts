import { describe, expect, it } from 'vitest';
import type { ParsedCard } from './chartData';
import type { CardData, MetabaseColumn } from './statistics.types';
import { parseTable, tableFromParsedCard } from './tableData';

type TestCol = Partial<MetabaseColumn> & { name: string };
const card = (cols: TestCol[], rows: CardData['rows']): CardData => ({
  cols: cols.map((col) => ({
    name: col.name,
    display_name: col.display_name ?? col.name,
    base_type: col.base_type ?? 'type/Text',
    semantic_type: col.semantic_type ?? null,
    source: col.source ?? null,
  })),
  rows,
});

const text = (name: string): TestCol => ({ name });
const metric = (name: string): TestCol => ({ name, base_type: 'type/Integer' });
const percent = (name: string): TestCol => ({ name, base_type: 'type/Float', semantic_type: 'type/Percentage' });

describe('parseTable', () => {
  it('returns null without data', () => {
    expect(parseTable(null)).toBeNull();
    expect(parseTable(undefined)).toBeNull();
  });

  it('returns null for empty rows or columns', () => {
    expect(parseTable(card([text('a'), metric('b')], []))).toBeNull();
    expect(parseTable(card([], [[]]))).toBeNull();
  });

  it('derives a share when the card exposes a single metric (card 47)', () => {
    const table = parseTable(
      card(
        [{ name: 'raison_cloture', display_name: 'Raison de clôture' }, metric('Nombre de requêtes')],
        [
          ['Hors compétence', 3],
          ['Autre', 1],
        ],
      ),
    );

    expect(table?.columns).toEqual([
      { label: 'Raison de clôture', kind: 'text' },
      { label: 'Nombre de requêtes', kind: 'number' },
    ]);
    expect(table?.derivedShare).toEqual({ label: 'Part (%)', columnIndex: 1, total: 4 });
  });

  it('keeps every column and derives nothing when the card exposes several metrics (card 106)', () => {
    const table = parseTable(
      card(
        [
          text('Entité'),
          metric('Nombre de comptes actifs'),
          metric("dont au niveau de l'entité"),
          metric('dont dans les directions et services'),
        ],
        [['DDETS du Rhône', 12, 5, 7]],
      ),
    );

    expect(table?.columns.map((column) => column.label)).toEqual([
      'Entité',
      'Nombre de comptes actifs',
      "dont au niveau de l'entité",
      'dont dans les directions et services',
    ]);
    expect(table?.derivedShare).toBeNull();
  });

  it('derives nothing when the SQL already computes a share (card 52)', () => {
    const table = parseTable(
      card([text('Motif'), metric('Nombre de requêtes'), percent('Part des requêtes (%)')], [['Violences', 3, 1.7]]),
    );

    expect(table?.columns.map((column) => column.kind)).toEqual(['text', 'number', 'percent']);
    expect(table?.derivedShare).toBeNull();
  });

  it('detects a percent column by name on a native SQL card', () => {
    const table = parseTable(
      card([text('Motif'), metric('Nombre'), { name: 'Part (%)', base_type: 'type/Decimal' }], [['Violences', 3, 1.7]]),
    );

    expect(table?.columns.map((column) => column.kind)).toEqual(['text', 'number', 'percent']);
    expect(table?.derivedShare).toBeNull();
  });

  it('keeps a text-only card as-is (card 46)', () => {
    const table = parseTable(card([text('id'), text('nomComplet'), text('label')], [['abc', 'DDETS', 'ddets']]));

    expect(table?.columns.map((column) => column.kind)).toEqual(['text', 'text', 'text']);
    expect(table?.derivedShare).toBeNull();
  });

  it('derives nothing on a single-column card', () => {
    expect(parseTable(card([metric('Nombre')], [[3], [4]]))?.derivedShare).toBeNull();
  });

  it('sums numeric strings to build the share base', () => {
    expect(
      parseTable(
        card(
          [text('a'), metric('n')],
          [
            ['A', '3'],
            ['B', 2],
            ['C', null],
          ],
        ),
      )?.derivedShare,
    ).toEqual({
      label: 'Part (%)',
      columnIndex: 1,
      total: 5,
    });
  });

  it('keeps the rows untouched', () => {
    const rows = [['A', 1]];
    expect(parseTable(card([text('a'), metric('n')], rows))?.rows).toBe(rows);
  });
});

describe('tableFromParsedCard', () => {
  const parsed: ParsedCard = {
    items: [
      { label: 'Ouvertes', value: 3 },
      { label: 'Clôturées', value: 1 },
    ],
    total: 4,
    dimensionLabel: 'Statut',
    metricLabel: 'Nombre',
    percentLabel: 'Part (%)',
    hasPrecomputedPercent: false,
  };

  it('derives the share when the card has none', () => {
    expect(tableFromParsedCard(parsed)).toEqual({
      columns: [
        { label: 'Statut', kind: 'text' },
        { label: 'Nombre', kind: 'number' },
      ],
      rows: [
        ['Ouvertes', 3],
        ['Clôturées', 1],
      ],
      derivedShare: { label: 'Part (%)', columnIndex: 1, total: 4 },
    });
  });

  it('exposes the SQL share as a third column', () => {
    const table = tableFromParsedCard({
      ...parsed,
      items: [{ label: 'Ouvertes', value: 3, percent: 1.7 }],
      percentLabel: 'Part des requêtes (%)',
      hasPrecomputedPercent: true,
    });

    expect(table.columns[2]).toEqual({ label: 'Part des requêtes (%)', kind: 'percent' });
    expect(table.rows).toEqual([['Ouvertes', 3, 1.7]]);
    expect(table.derivedShare).toBeNull();
  });
});
