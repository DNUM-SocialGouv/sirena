import { describe, expect, it } from 'vitest';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { buildCardCsv, buildCardCsvFilename, serializeCsv } from './statisticsCsv';

const BOM = String.fromCharCode(0xfeff);

describe('serializeCsv', () => {
  it('prefixes a BOM, uses ; as delimiter and \\n as line break', () => {
    expect(
      serializeCsv(
        ['A', 'B'],
        [
          ['1', '2'],
          ['3', '4'],
        ],
      ),
    ).toBe(`${BOM}A;B\n1;2\n3;4`);
  });

  it('quotes cells containing ; " or line breaks and doubles inner quotes', () => {
    expect(serializeCsv(['x'], [['a;b'], ['he said "hi"'], ['line1\nline2']])).toBe(
      `${BOM}x\n"a;b"\n"he said ""hi"""\n"line1\nline2"`,
    );
  });

  it('neutralises formula-leading cells (CSV injection protection)', () => {
    expect(serializeCsv(['x'], [['=1+1'], ['+A1'], ['-2'], ['@cmd']])).toBe(`${BOM}x\n'=1+1\n'+A1\n'-2\n'@cmd`);
  });

  it('renders null/undefined as empty cells', () => {
    expect(serializeCsv(['a', 'b'], [[null, undefined]])).toBe(`${BOM}a;b\n;`);
  });
});

describe('buildCardCsv', () => {
  it('uses column display_name as header and data rows as body', () => {
    const card = {
      data: {
        cols: [
          {
            name: 'raison',
            display_name: 'Raison de clôture',
            base_type: 'type/Text',
            semantic_type: null,
            source: null,
          },
          { name: 'nb', display_name: 'Nombre', base_type: 'type/Integer', semantic_type: null, source: null },
        ],
        rows: [
          ['Hors compétence', 3],
          ['Autre', 2],
        ],
      },
    } as unknown as StatisticsCard;

    expect(buildCardCsv(card)).toBe(`${BOM}Raison de clôture;Nombre\nHors compétence;3\nAutre;2`);
  });
});

describe('buildCardCsvFilename', () => {
  it('slugifies the card name and appends .csv', () => {
    expect(buildCardCsvFilename('Répartition par raison de clôture')).toBe('répartition-par-raison-de-clôture.csv');
  });

  it('falls back to a default when the name has no usable characters', () => {
    expect(buildCardCsvFilename('  ---  ')).toBe('indicateur.csv');
  });
});
