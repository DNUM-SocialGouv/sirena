import { describe, expect, it } from 'vitest';
import { transformSirecVictime } from './sirecMigration.victime.transformer.js';

describe('sirecMigration.victime.transformer.ts', () => {
  const reclamation = {
    victime_non_identifiee: null as number | null,
    victime_sexe: null as number | null,
    victime_nom: null as string | null,
    victime_prenom: null as string | null,
    victime_mail: null as string | null,
    victime_tel: null as string | null,
  } as Parameters<typeof transformSirecVictime>[0];

  it('should return null when all victime fields are null', () => {
    expect(transformSirecVictime(reclamation)).toBeNull();
  });

  it('should return null when victime_non_identifiee is 0 and no identite', () => {
    expect(transformSirecVictime({ ...reclamation, victime_non_identifiee: 0 })).toBeNull();
  });

  it('should set commentaire to "Usager (Victime) non identifié : oui" when victime_non_identifiee=1', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1 });

    expect(result).toEqual({ identite: null, commentaire: 'Usager (Victime) non identifié : oui' });
  });

  it('should set identite from victime_nom, victime_prenom, victime_mail, victime_tel', () => {
    const result = transformSirecVictime({
      ...reclamation,
      victime_nom: 'Martin',
      victime_prenom: 'Alice',
      victime_mail: 'alice@example.com',
      victime_tel: '0612345678',
    });

    expect(result?.identite).toEqual({
      nom: 'Martin',
      prenom: 'Alice',
      email: 'alice@example.com',
      telephone: '0612345678',
      civiliteId: null,
    });
  });

  it('should set civiliteId to CIVILITE.M when victime_sexe=38', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', victime_sexe: 38 });

    expect(result?.identite?.civiliteId).toBe('M');
  });

  it('should set civiliteId to CIVILITE.MME when victime_sexe=40', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', victime_sexe: 40 });

    expect(result?.identite?.civiliteId).toBe('MME');
  });

  it('should set civiliteId to null when victime_sexe is null', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', victime_sexe: null });

    expect(result?.identite?.civiliteId).toBeNull();
  });

  it('should return non-null identite when only victime_sexe is set', () => {
    const result = transformSirecVictime({ ...reclamation, victime_sexe: 38 });

    expect(result?.identite).not.toBeNull();
    expect(result?.identite?.civiliteId).toBe('M');
  });

  it('should return non-null with identite when victime_nom is set alone', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin' });

    expect(result).not.toBeNull();
    expect(result?.identite?.nom).toBe('Martin');
  });

  it('should set identite.nom to null when victime_nom is null', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: null, victime_prenom: 'Alice' });

    expect(result?.identite?.nom).toBeNull();
  });

  it('should set identite to null when all identite fields are null', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1 });

    expect(result?.identite).toBeNull();
  });
});
