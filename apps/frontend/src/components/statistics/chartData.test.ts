import { describe, expect, it } from 'vitest';
import { annularSectorPath, parseCard } from './chartData';

describe('chartData', () => {
  describe('parseCard', () => {
    it('returns null for empty rows', () => {
      expect(parseCard([])).toBeNull();
    });

    it('returns null when there is only one column', () => {
      expect(parseCard([{ only: 1 }])).toBeNull();
    });

    it('detects the numeric metric column and the text dimension column', () => {
      const parsed = parseCard([
        { raison_cloture: 'Hors compétence', nb_requetes: 3 },
        { raison_cloture: 'Autre', nb_requetes: 1 },
      ]);

      expect(parsed).toEqual({
        items: [
          { label: 'Hors compétence', value: 3 },
          { label: 'Autre', value: 1 },
        ],
        total: 4,
        dimensionLabel: 'Raison cloture',
        metricLabel: 'Nombre de requetes',
      });
    });

    it('picks the last numeric column as metric when several columns are numeric (e.g. id + value)', () => {
      const parsed = parseCard([
        { id: 7, raison_cloture: 'Hors compétence', nb_requetes: 3 },
        { id: 8, raison_cloture: 'Autre', nb_requetes: 1 },
      ]);

      expect(parsed?.items).toEqual([
        { label: 'Hors compétence', value: 3 },
        { label: 'Autre', value: 1 },
      ]);
      expect(parsed?.metricLabel).toBe('Nombre de requetes');
      expect(parsed?.dimensionLabel).toBe('Raison cloture');
    });

    it('coerces numeric strings into the metric value', () => {
      const parsed = parseCard([{ cat: 'A', n: '5' }]);
      expect(parsed?.items).toEqual([{ label: 'A', value: 5 }]);
      expect(parsed?.total).toBe(5);
    });

    it('falls back to "Non précisé" for a missing dimension label', () => {
      const parsed = parseCard([{ raison: null, nb: 2 }]);
      expect(parsed?.items[0].label).toBe('Non précisé');
    });

    it('falls back to 0 when no column is fully numeric', () => {
      const parsed = parseCard([{ a: 'x', b: 'y' }]);
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
