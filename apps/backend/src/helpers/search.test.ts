import { describe, expect, it } from 'vitest';
import { createSearchConditionsForRequeteEntite } from './search.js';

const serialize = (value: unknown) => JSON.stringify(value);

describe('search helpers', () => {
  describe('createSearchConditionsForRequeteEntite', () => {
    it('should return an empty object for an empty or whitespace-only search', () => {
      expect(createSearchConditionsForRequeteEntite('')).toEqual({});
      expect(createSearchConditionsForRequeteEntite('   ')).toEqual({});
    });

    it('should search mis en cause by rpps, nom, prenom, finess and nomService', () => {
      const where = serialize(createSearchConditionsForRequeteEntite('martin'));

      const ci = '{"contains":"martin","mode":"insensitive"}';
      expect(where).toContain(`"misEnCause":{"rpps":${ci}}`);
      expect(where).toContain(`"misEnCause":{"nom":${ci}}`);
      expect(where).toContain(`"misEnCause":{"prenom":${ci}}`);
      expect(where).toContain(`"misEnCause":{"finess":${ci}}`);
      expect(where).toContain(`"misEnCause":{"nomService":${ci}}`);
    });

    it('should match a mis en cause carrying both first and last name for a two-word search', () => {
      const where = serialize(createSearchConditionsForRequeteEntite('jean martin'));

      expect(where).toContain(
        '"misEnCause":{"prenom":{"contains":"jean","mode":"insensitive"},"nom":{"contains":"martin","mode":"insensitive"}}',
      );
      expect(where).toContain(
        '"misEnCause":{"prenom":{"contains":"martin","mode":"insensitive"},"nom":{"contains":"jean","mode":"insensitive"}}',
      );
    });

    it('should still search lieu de survenue finess (existing behaviour preserved)', () => {
      const where = serialize(createSearchConditionsForRequeteEntite('750000000'));
      expect(where).toContain('"lieuDeSurvenue":{"finess":{"contains":"750000000","mode":"insensitive"}}');
    });
  });
});
