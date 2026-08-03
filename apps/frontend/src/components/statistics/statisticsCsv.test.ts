import { describe, expect, it } from 'vitest';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { buildCardCsv, buildCardCsvFilename } from './statisticsCsv';

const BOM = String.fromCharCode(0xfeff);

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
