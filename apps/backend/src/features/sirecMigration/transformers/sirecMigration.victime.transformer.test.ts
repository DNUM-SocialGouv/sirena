import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecVictime } from './sirecMigration.victime.transformer.js';

describe('sirecMigration.victime.transformer.ts', () => {
  const reclamation = {
    victime_non_identifiee: null as number | null,
    victime_age: null as number | null,
    victime_sexe: null as number | null,
    victime_adresse: null as string | null,
    victime_adresse_complement: null as string | null,
    usager_adresse: null as string | null,
    usager_adresse_complete: null as string | null,
    usager_cp: null as string | null,
    usager_ville: null as string | null,
    victime_nom: null as string | null,
    victime_prenom: null as string | null,
    victime_mail: null as string | null,
    victime_tel: null as string | null,
    mandataire_judiciaire: null as number | null,
    mandataire_precisez: null as number | null,
  } as Parameters<typeof transformSirecVictime>[0];

  it('should return null when all victime fields are null', () => {
    expect(transformSirecVictime(reclamation)).toBeNull();
  });

  it('should return null when victime_non_identifiee is 0 and no identite', () => {
    expect(transformSirecVictime({ ...reclamation, victime_non_identifiee: 0 })).toBeNull();
  });

  it('should set commentaire to "Usager (Victime) non identifié : oui" when victime_non_identifiee=1', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1 });

    expect(result).toEqual({
      identite: null,
      adresse: null,
      commentaire: 'Usager (Victime) non identifié : oui',
      ageId: null,
      mesureProtection: null,
    });
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

  it('should return null when all victime fields including address are null', () => {
    expect(transformSirecVictime(reclamation)).toBeNull();
  });

  it('should return non-null with adresse when only victime_adresse is set', () => {
    const result = transformSirecVictime({ ...reclamation, victime_adresse: '5 rue des Lilas' });

    expect(result).not.toBeNull();
    expect(result?.adresse).toEqual({ rue: '5 rue des Lilas', codePostal: null, ville: null });
  });

  it('should concatenate victime_adresse, victime_adresse_complement, usager_adresse into rue', () => {
    const result = transformSirecVictime({
      ...reclamation,
      victime_adresse: '5 rue des Lilas',
      victime_adresse_complement: 'Bât B',
      usager_adresse: 'Lieu-dit La Forêt',
    });

    expect(result?.adresse?.rue).toBe('5 rue des Lilas Bât B Lieu-dit La Forêt');
  });

  it('should set rue to null when all address line fields are null', () => {
    const result = transformSirecVictime({ ...reclamation, usager_cp: '69001' });

    expect(result?.adresse?.rue).toBeNull();
  });

  it('should map usager_cp to codePostal and usager_ville to ville', () => {
    const result = transformSirecVictime({
      ...reclamation,
      victime_adresse: '5 rue des Lilas',
      usager_cp: '69001',
      usager_ville: 'Lyon',
    });

    expect(result?.adresse).toEqual({ rue: '5 rue des Lilas', codePostal: '69001', ville: 'Lyon' });
  });

  it('should return adresse null when all address fields are null', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin' });

    expect(result?.adresse).toBeNull();
  });

  it('should return non-null when only usager_ville is set', () => {
    const result = transformSirecVictime({ ...reclamation, usager_ville: 'Lyon' });

    expect(result?.adresse).toEqual({ rue: null, codePostal: null, ville: 'Lyon' });
  });

  it('should use usager_adresse_complete in rue when usager_adresse is null', () => {
    const result = transformSirecVictime({
      ...reclamation,
      usager_adresse: null,
      usager_adresse_complete: '5 allée des Roses',
    });

    expect(result?.adresse?.rue).toBe('5 allée des Roses');
  });

  it('should prefer usager_adresse over usager_adresse_complete when both are set', () => {
    const result = transformSirecVictime({
      ...reclamation,
      usager_adresse: '5 rue des Lilas',
      usager_adresse_complete: 'Adresse complète ignorée',
    });

    expect(result?.adresse?.rue).toBe('5 rue des Lilas');
  });

  it('should return null when only usager_adresse_complete is null and no other data', () => {
    expect(transformSirecVictime({ ...reclamation, usager_adresse_complete: null })).toBeNull();
  });

  it('should set mesureProtection to MANDATAIRE_JUDICIAIRE when mandataire_judiciaire=1', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', mandataire_judiciaire: 1 });

    expect(result?.mesureProtection).toBe('MANDATAIRE_JUDICIAIRE');
  });

  it('should set mesureProtection to MANDATAIRE_JUDICIAIRE when mandataire_judiciaire=112', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', mandataire_judiciaire: 112 });

    expect(result?.mesureProtection).toBe('MANDATAIRE_JUDICIAIRE');
  });

  it('should set mesureProtection to null when mandataire_judiciaire=0', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', mandataire_judiciaire: 0 });

    expect(result?.mesureProtection).toBeNull();
  });

  it('should set mesureProtection to null when mandataire_judiciaire=111', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', mandataire_judiciaire: 111 });

    expect(result?.mesureProtection).toBeNull();
  });

  it('should set mesureProtection to null when mandataire_judiciaire is null', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', mandataire_judiciaire: null });

    expect(result?.mesureProtection).toBeNull();
  });

  it('should throw SirecTranscoError for unknown mandataire_judiciaire value', () => {
    expect(() => transformSirecVictime({ ...reclamation, mandataire_judiciaire: 999 })).toThrow(SirecTranscoError);
  });

  it('should return non-null when only mandataire_judiciaire=1 is set', () => {
    expect(transformSirecVictime({ ...reclamation, mandataire_judiciaire: 1 })).not.toBeNull();
  });

  it('should append mandataire_precisez label to commentaire when set', () => {
    const result = transformSirecVictime({
      ...reclamation,
      victime_nom: 'Martin',
      mandataire_precisez: 108,
    });

    expect(result?.commentaire).toBe('Précisions concernant le mandat judiciaire : Curatelle');
  });

  it('should append mandataire_precisez 109 as Sauvegarde de justice', () => {
    const result = transformSirecVictime({ ...reclamation, victime_nom: 'Martin', mandataire_precisez: 109 });

    expect(result?.commentaire).toBe('Précisions concernant le mandat judiciaire : Sauvegarde de justice');
  });

  it('should not add to commentaire when mandataire_precisez is null', () => {
    const result = transformSirecVictime({ ...reclamation, victime_non_identifiee: 1, mandataire_precisez: null });

    expect(result?.commentaire).toBe('Usager (Victime) non identifié : oui');
  });

  it('should not add to commentaire when mandataire_precisez is unknown', () => {
    const result = transformSirecVictime({
      ...reclamation,
      victime_non_identifiee: 1,
      mandataire_precisez: 99999,
    });

    expect(result?.commentaire).toBe('Usager (Victime) non identifié : oui');
  });

  it('should combine mandataire_precisez with other commentaire parts', () => {
    const result = transformSirecVictime({
      ...reclamation,
      victime_non_identifiee: 1,
      mandataire_precisez: 110,
    });

    expect(result?.commentaire).toBe(
      'Usager (Victime) non identifié : oui\nPrécisions concernant le mandat judiciaire : Tutelle',
    );
  });
});
