import { describe, expect, it } from 'vitest';
import { transformSirecVictime } from './sirecMigration.victime.transformer.js';

describe('sirecMigration.victime.transformer.ts', () => {
  const reclamation = {
    victime_non_identifiee: null as number | null,
  } as Parameters<typeof transformSirecVictime>[0];

  it('should return null when victime_non_identifiee is null', () => {
    expect(transformSirecVictime({ ...reclamation, victime_non_identifiee: null })).toBeNull();
  });

  it('should return null when victime_non_identifiee is 0', () => {
    expect(transformSirecVictime({ ...reclamation, victime_non_identifiee: 0 })).toBeNull();
  });

  it('should set commentaire to "Usager (Victime) non identifié : oui" when victime_non_identifiee=1', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1 });

    expect(result).toEqual({ identite: null, commentaire: 'Usager (Victime) non identifié : oui' });
  });
});
