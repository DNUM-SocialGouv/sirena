import { describe, expect, it } from 'vitest';
import { transformSirecVictime } from './sirecMigration.victime.transformer.js';

describe('sirecMigration.victime.transformer.ts', () => {
  const reclamation = {
    victime_non_identifiee: null as number | null,
    victime_age: null as number | null,
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

    expect(result).toEqual({ identite: null, commentaire: 'Usager (Victime) non identifié : oui', ageId: null });
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

  it('should return null when victime_age is negative and no other data', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: -1 })).toBeNull();
  });

  it('should set ageId to "-18" for victime_age=0', () => {
    const result = transformSirecVictime({ ...reclamation, victime_age: 0 });

    expect(result?.ageId).toBe('-18');
  });

  it('should set ageId to "-18" for victime_age=17', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: 17 })?.ageId).toBe('-18');
  });

  it('should set ageId to "18-29" for victime_age=18', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: 18 })?.ageId).toBe('18-29');
  });

  it('should set ageId to "30-59" for victime_age=45', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: 45 })?.ageId).toBe('30-59');
  });

  it('should set ageId to "60-79" for victime_age=70', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: 70 })?.ageId).toBe('60-79');
  });

  it('should set ageId to ">= 80" for victime_age=80', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: 80 })?.ageId).toBe('>= 80');
  });

  it('should set ageId to null when victime_age is null', () => {
    expect(transformSirecVictime({ ...reclamation, victime_nom: 'Martin', victime_age: null })?.ageId).toBeNull();
  });

  it('should add "Age de la victime : X" to commentaire when victime_age is set', () => {
    const result = transformSirecVictime({ ...reclamation, victime_age: 45 });

    expect(result?.commentaire).toBe('Age de la victime : 45');
  });

  it('should not add age to commentaire when victime_age is negative', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1, victime_age: -5 });

    expect(result?.commentaire).toBe('Usager (Victime) non identifié : oui');
  });

  it('should combine age comment with other commentaire parts', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1, victime_age: 30 });

    expect(result?.commentaire).toBe('Usager (Victime) non identifié : oui\nAge de la victime : 30');
  });

  it('should return non-null when only victime_age is set', () => {
    expect(transformSirecVictime({ ...reclamation, victime_age: 25 })).not.toBeNull();
  });
});
