import { describe, expect, it } from 'vitest';
import { annularSectorPath, type CardData, type MetabaseColumn, parseCard } from './chartData';

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

const dim = (name: string): TestCol => ({ name, source: 'breakout' });
const metric = (name: string): TestCol => ({ name, base_type: 'type/Integer', source: 'aggregation' });
const percent = (name: string): TestCol => ({ name, base_type: 'type/Float', semantic_type: 'type/Percentage' });

describe('chartData', () => {
  describe('parseCard', () => {
    it('returns null for empty rows', () => {
      expect(parseCard(card([dim('a'), metric('b')], []))).toBeNull();
    });

    it('returns null when there is only one column', () => {
      expect(parseCard(card([metric('only')], [[1]]))).toBeNull();
    });

    it('uses the Metabase breakout/aggregation roles and their display names', () => {
      const parsed = parseCard(
        card(
          [
            { name: 'raison_cloture', display_name: 'Raison de clôture', source: 'breakout' },
            {
              name: 'nb_requetes',
              display_name: 'Nombre de requêtes',
              base_type: 'type/Integer',
              source: 'aggregation',
            },
          ],
          [
            ['Hors compétence', 3],
            ['Autre', 1],
          ],
        ),
      );

      expect(parsed).toEqual({
        items: [
          { label: 'Hors compétence', value: 3 },
          { label: 'Autre', value: 1 },
        ],
        total: 4,
        dimensionLabel: 'Raison de clôture',
        metricLabel: 'Nombre de requêtes',
        percentLabel: 'Part (%)',
        hasPrecomputedPercent: false,
      });
    });

    it('picks the aggregation column as metric when several columns are numeric (e.g. id + value)', () => {
      const parsed = parseCard(
        card(
          [
            { name: 'id', base_type: 'type/Integer' },
            { name: 'raison_cloture', display_name: 'Raison de clôture', source: 'breakout' },
            {
              name: 'nb_requetes',
              display_name: 'Nombre de requêtes',
              base_type: 'type/Integer',
              source: 'aggregation',
            },
          ],
          [
            [7, 'Hors compétence', 3],
            [8, 'Autre', 1],
          ],
        ),
      );

      expect(parsed?.items).toEqual([
        { label: 'Hors compétence', value: 3 },
        { label: 'Autre', value: 1 },
      ]);
      expect(parsed?.metricLabel).toBe('Nombre de requêtes');
      expect(parsed?.dimensionLabel).toBe('Raison de clôture');
    });

    it('keeps a percent-typed column as the share instead of treating it as the metric', () => {
      const parsed = parseCard(
        card(
          [
            dim('Motif'),
            { name: 'Nombre de requêtes', base_type: 'type/Integer', source: 'aggregation' },
            percent('Part (%)'),
          ],
          [
            ['Violences physiques', 3, 1.7],
            ['Dérives sectaires', 1, 0.6],
          ],
        ),
      );

      expect(parsed?.metricLabel).toBe('Nombre de requêtes');
      expect(parsed?.percentLabel).toBe('Part (%)');
      expect(parsed?.hasPrecomputedPercent).toBe(true);
      expect(parsed?.items).toEqual([
        { label: 'Violences physiques', value: 3, percent: 1.7 },
        { label: 'Dérives sectaires', value: 1, percent: 0.6 },
      ]);
    });

    it('detects a percent column by name on a native SQL card (no Metabase metadata)', () => {
      // Requête SQL native : Metabase ne type rien (semantic_type null, source null).
      const parsed = parseCard(
        card(
          [
            { name: 'Motif' },
            { name: 'Nombre de requêtes', base_type: 'type/Integer' },
            { name: 'Part (%)', base_type: 'type/Decimal' },
          ],
          [
            ['Violences physiques', 3, 1.7],
            ['Aucun motif', 1, 0.6],
          ],
        ),
      );

      expect(parsed?.dimensionLabel).toBe('Motif');
      expect(parsed?.metricLabel).toBe('Nombre de requêtes');
      expect(parsed?.percentLabel).toBe('Part (%)');
      expect(parsed?.hasPrecomputedPercent).toBe(true);
      expect(parsed?.items).toEqual([
        { label: 'Violences physiques', value: 3, percent: 1.7 },
        { label: 'Aucun motif', value: 1, percent: 0.6 },
      ]);
    });

    it('treats a lone percent column as the metric rather than zeroing the values', () => {
      const parsed = parseCard(
        card(
          [dim('Motif'), percent('Part (%)')],
          [
            ['Violences physiques', 1.7],
            ['Dérives sectaires', 0.6],
          ],
        ),
      );

      expect(parsed?.hasPrecomputedPercent).toBe(false);
      expect(parsed?.metricLabel).toBe('Part (%)');
      expect(parsed?.items).toEqual([
        { label: 'Violences physiques', value: 1.7 },
        { label: 'Dérives sectaires', value: 0.6 },
      ]);
      expect(parsed?.total).toBeCloseTo(2.3);
    });

    it('keeps the count as the metric when several percent-typed columns are present', () => {
      const parsed = parseCard(
        card(
          [dim('Motif'), metric('Nombre'), percent('Part (%)'), percent('Pourcentage cumulé')],
          [
            ['A', 3, 60, 60],
            ['B', 2, 40, 100],
          ],
        ),
      );

      expect(parsed?.metricLabel).toBe('Nombre');
      expect(parsed?.percentLabel).toBe('Part (%)');
      expect(parsed?.hasPrecomputedPercent).toBe(true);
      expect(parsed?.total).toBe(5);
      expect(parsed?.items).toEqual([
        { label: 'A', value: 3, percent: 60 },
        { label: 'B', value: 2, percent: 40 },
      ]);
    });

    it('coerces numeric strings into the metric value', () => {
      const parsed = parseCard(card([dim('cat'), metric('n')], [['A', '5']]));
      expect(parsed?.items).toEqual([{ label: 'A', value: 5 }]);
      expect(parsed?.total).toBe(5);
    });

    it('falls back to "Non précisé" for a missing dimension label', () => {
      const parsed = parseCard(card([dim('raison'), metric('nb')], [[null, 2]]));
      expect(parsed?.items[0].label).toBe('Non précisé');
    });

    it('falls back to 0 when no column is numeric', () => {
      const parsed = parseCard(card([{ name: 'a' }, { name: 'b' }], [['x', 'y']]));
      expect(parsed?.items).toEqual([{ label: 'x', value: 0 }]);
      expect(parsed?.total).toBe(0);
    });
  });

  describe('annularSectorPath', () => {
    it('produces a closed path referencing both radii', () => {
      const path = annularSectorPath(120, 120, 112, 68, 0, 90);
      expect(path.startsWith('M')).toBe(true);
      expect(path).toContain('A 112 112');
      expect(path).toContain('A 68 68');
      expect(path.endsWith('Z')).toBe(true);
    });

    it('sets the large-arc flag for sweeps greater than 180°', () => {
      expect(annularSectorPath(120, 120, 112, 68, 0, 270)).toContain('A 112 112 0 1 1');
      expect(annularSectorPath(120, 120, 112, 68, 0, 90)).toContain('A 112 112 0 0 1');
    });
  });
});
