import { describe, expect, it } from 'vitest';
import { createSearchConditionsForRequeteEntite } from './search.js';

const serialize = (value: unknown) => JSON.stringify(value);
const contains = (value: string) => ({ contains: value, mode: 'insensitive' });

describe('search helpers', () => {
  describe('createSearchConditionsForRequeteEntite', () => {
    it('should return an empty object for an empty or whitespace-only search', () => {
      expect(createSearchConditionsForRequeteEntite('')).toEqual({});
      expect(createSearchConditionsForRequeteEntite('   ')).toEqual({});
    });

    it('keeps the declarant and participant identity and address fields searchable', () => {
      const value = contains('martin');
      const identity = {
        OR: expect.arrayContaining([{ prenom: value }, { nom: value }, { email: value }, { telephone: value }]),
      };
      const address = { OR: expect.arrayContaining([{ ville: value }, { codePostal: value }]) };

      expect(createSearchConditionsForRequeteEntite('martin')).toMatchObject({
        OR: expect.arrayContaining([
          { requete: { declarant: { identite: identity } } },
          { requete: { declarant: { adresse: address } } },
          { requete: { participant: { identite: identity } } },
          { requete: { participant: { adresse: address } } },
        ]),
      });
    });

    it('keeps both parts of a name on the same Mis en cause, in either order', () => {
      const first = contains('jean');
      const last = contains('martin');

      expect(createSearchConditionsForRequeteEntite('jean martin')).toMatchObject({
        OR: expect.arrayContaining([
          {
            requete: {
              situations: {
                some: {
                  misEnCause: {
                    OR: expect.arrayContaining([
                      { prenom: first, nom: last },
                      { prenom: last, nom: first },
                    ]),
                  },
                },
              },
            },
          },
        ]),
      });
    });

    it('keeps Mis en cause and occurrence-place identifiers searchable', () => {
      const value = contains('750000000');
      expect(createSearchConditionsForRequeteEntite('750000000')).toMatchObject({
        OR: expect.arrayContaining([
          {
            requete: {
              situations: {
                some: {
                  misEnCause: {
                    OR: expect.arrayContaining([{ rpps: value }, { finess: value }, { nomService: value }]),
                  },
                },
              },
            },
          },
          {
            requete: {
              situations: {
                some: {
                  lieuDeSurvenue: {
                    OR: expect.arrayContaining([
                      { finess: value },
                      {
                        adresse: {
                          OR: expect.arrayContaining([{ ville: value }, { codePostal: value }, { label: value }]),
                        },
                      },
                    ]),
                  },
                },
              },
            },
          },
        ]),
      });
    });

    it('should compare dematSocialId for a number within the int32 range', () => {
      const where = serialize(createSearchConditionsForRequeteEntite('123456'));
      expect(where).toContain('"dematSocialId":123456');
    });

    it('should NOT compare dematSocialId for a number exceeding the int32 range (RPPS 500 regression)', () => {
      // A 12-digit RPPS overflows int4 and used to make Postgres throw (out of range) → 500.
      const where = serialize(createSearchConditionsForRequeteEntite('810103127360'));
      expect(where).not.toContain('dematSocialId');
    });

    it('should NOT compare dematSocialId for non plain-digit inputs (decimal, negative, scientific)', () => {
      for (const input of ['12.5', '-5', '1e3']) {
        expect(serialize(createSearchConditionsForRequeteEntite(input))).not.toContain('dematSocialId');
      }
    });
  });
});
