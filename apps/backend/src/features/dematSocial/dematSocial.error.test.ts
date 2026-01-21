import { describe, expect, it } from 'vitest';
import type { RootChampFragmentFragment } from '../../libs/graffle.js';
import { ChampMappingError, EnumNotFound } from './dematSocial.error.js';

describe('dematSocial.error.ts', () => {
  describe('ChampMappingError', () => {
    it('create a ChampMappingError', () => {
      const champ = {} as unknown as RootChampFragmentFragment;
      const err = new ChampMappingError(champ, 'SomeType', 'Mapping failed', 'bad format');

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ChampMappingError);
      expect(err.name).toBe('ChampMappingError');
      expect(err.message).toBe('Mapping failed');
      expect(err.cause).toBe('bad format');
      expect(err.type).toBe('SomeType');
      expect(err.champ).toBe(champ);
      expect(typeof err.stack).toBe('string');
    });

    it('cause est optionnelle', () => {
      const champ = {} as unknown as import('./dematSocial.type.js').RepetitionChamp;
      const err = new ChampMappingError(champ, 'OtherType', 'Oops');

      expect(err.cause).toBeUndefined();
      expect(err.type).toBe('OtherType');
      expect(err.champ).toBe(champ);
    });
  });

  describe('EnumNotFound', () => {
    it('create a EnumNotFound', () => {
      const err = new EnumNotFound('Value not found');

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(EnumNotFound);
      expect(err.name).toBe('EnumNotFound');
      expect(err.message).toBe('Value not found');
      expect(typeof err.stack).toBe('string');
    });
  });
});
