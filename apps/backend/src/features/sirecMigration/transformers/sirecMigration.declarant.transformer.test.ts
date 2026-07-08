/** biome-ignore-all lint/suspicious/noExplicitAny: test purposes */
import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformDeclarantIdentite, transformSirecDeclarant } from './sirecMigration.declarant.transformer.js';

describe('sirecMigration.declarant.transformer.ts', () => {
  const reclamation = {
    plaignant: null as number | null,
    plaignant_anonyme: null as number | null,
    plaignant_est_anonyme: null as number | null,
    plaignant_type: null as number | null,
    plaignant_adresse: null as string | null,
    plaignant_adresse_complement: null as string | null,
    requerant_adresse: null as string | null,
    requerant_adresse_complete: null as string | null,
    requerant_cp: null as string | null,
    requerant_ville: null as string | null,
    preciser_statut: null as string | null,
    plaignant_rs: null as string | null,
    nom_representant: null as string | null,
    prenom_representant: null as string | null,
    plaignant_nom: null as string | null,
    plaignant_prenom: null as string | null,
    plaignant_mail: null as string | null,
    plaignant_tel: null as string | null,
    plaignant_connu: null as number | null,
    victime_lien_plaignant: null as number | null,
    lien_plai_autre: null as string | null,
    signalement: null as number | null,
  } as any;

  it('should map plaignant=34 to declarant with estVictime true', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant: 34 });

    expect(result).toEqual({
      estVictime: true,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: '',
      estSignalementProfessionnel: null,
    });
  });

  it('should map plaignant=36 to declarant with estVictime false', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant: 36 });

    expect(result).toEqual({
      estVictime: false,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: '',
      estSignalementProfessionnel: null,
    });
  });

  it('should return null when all declarant fields are null', () => {
    expect(transformSirecDeclarant(reclamation)).toBeNull();
  });

  it('should set commentaire when plaignant_est_anonyme=1', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant_est_anonyme: 1 });

    expect(result).toEqual({
      estVictime: null,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: 'Le requérant est anonyme : oui',
      estSignalementProfessionnel: null,
    });
  });

  it('should create declarant from plaignant_est_anonyme alone even if plaignant is null', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant: null, plaignant_est_anonyme: 1 })).not.toBeNull();
  });

  it('should leave commentaire empty when plaignant_est_anonyme is null', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant: 34, plaignant_est_anonyme: null })?.commentaire).toBe(
      '',
    );
  });

  it('should return only estVictime when estVictime is true, ignoring other fields', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant: 34, plaignant_est_anonyme: 1 });

    expect(result).toEqual({
      estVictime: true,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: '',
      estSignalementProfessionnel: null,
    });
  });

  it('should map plaignant_anonyme=1 to veutGarderAnonymat true', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_anonyme: 1 })?.veutGarderAnonymat).toBe(true);
  });

  it('should map plaignant_anonyme=112 to veutGarderAnonymat true', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_anonyme: 112 })?.veutGarderAnonymat).toBe(true);
  });

  it('should map plaignant_anonyme=0 to veutGarderAnonymat false', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_anonyme: 0 })?.veutGarderAnonymat).toBe(false);
  });

  it('should map plaignant_anonyme=111 to veutGarderAnonymat false', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_anonyme: 111 })?.veutGarderAnonymat).toBe(false);
  });

  it('should map null plaignant_anonyme to null veutGarderAnonymat', () => {
    expect(
      transformSirecDeclarant({ ...reclamation, plaignant: 34, plaignant_anonyme: null })?.veutGarderAnonymat,
    ).toBeNull();
  });

  it('should create declarant from plaignant_anonyme alone even if plaignant is null', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant: null, plaignant_anonyme: 1 })).not.toBeNull();
  });

  it('should add statut and detail lines to commentaire when plaignant_type=22', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 22,
      preciser_statut: 'Précision statut',
      plaignant_rs: 'Ma société',
      nom_representant: 'Dupont',
      prenom_representant: 'Jean',
    });

    expect(result?.commentaire).toBe(
      'Statut : Personne moral\nPrécisions : Précision statut\nRaison sociale : Ma société\nNom du représentant des requérants : Dupont\nPrénom du représentant des requérants : Jean',
    );
  });

  it('should add statut and detail lines to commentaire when plaignant_type=106', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant_type: 106, plaignant_rs: 'Asso' });

    expect(result?.commentaire).toContain('Statut : Autre');
    expect(result?.commentaire).toContain('Raison sociale : Asso');
  });

  it('should skip null detail fields in commentaire for plaignant_type=22', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_type: 22 })?.commentaire).toBe(
      'Statut : Personne moral',
    );
  });

  it('should create declarant from plaignant_type=22 alone', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_type: 22 })).not.toBeNull();
  });

  it('should return null when plaignant_type is not 22 or 106', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_type: 24, plaignant_rs: 'Ignoré' })).toBeNull();
  });

  it('should return null when plaignant_type is null', () => {
    expect(transformSirecDeclarant(reclamation)).toBeNull();
  });

  it('should set adresse when plaignant_type is physical (not in PLAIGNANT_TYPE_PAS_PHYSIQUE)', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 24,
      plaignant_adresse: '12 rue de la Paix',
    });

    expect(result?.adresse).toEqual({ rue: '12 rue de la Paix', codePostal: null, ville: null });
    expect(result?.commentaire).toBe('');
  });

  it('should add adresse to commentaire when plaignant_type is in PLAIGNANT_TYPE_PAS_PHYSIQUE (22)', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 22,
      requerant_adresse: '12 rue de la Paix',
    });

    expect(result?.adresse).toBeNull();
    expect(result?.commentaire).toContain('Adresse : 12 rue de la Paix');
  });

  it('should add adresse to commentaire when plaignant_type is null', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: null,
      requerant_adresse: '12 rue de la Paix',
    });

    expect(result?.adresse).toBeNull();
    expect(result?.commentaire).toBe('Adresse : 12 rue de la Paix');
  });

  it('should create declarant from plaignant_adresse alone (physical type)', () => {
    expect(
      transformSirecDeclarant({ ...reclamation, plaignant_type: 24, plaignant_adresse: '12 rue de la Paix' }),
    ).not.toBeNull();
  });

  it('should return null when plaignant_adresse is null and no other fields', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_type: 24, plaignant_adresse: null })).toBeNull();
  });

  it('should concatenate plaignant_adresse and plaignant_adresse_complement into adresse.rue for physical person', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 24,
      plaignant_adresse: '12 rue de la Paix',
      plaignant_adresse_complement: 'Bât A',
    });

    expect(result?.adresse).toEqual({ rue: '12 rue de la Paix Bât A', codePostal: null, ville: null });
  });

  it('should use only complement in adresse.rue when plaignant_adresse is null for physical person', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 24,
      plaignant_adresse: null,
      plaignant_adresse_complement: 'Bât A',
    });

    expect(result?.adresse).toEqual({ rue: 'Bât A', codePostal: null, ville: null });
  });

  it('should add plaignant_adresse_complement to commentaire for non-physical person', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 22,
      plaignant_adresse_complement: 'Bât A',
    });

    expect(result?.commentaire).toContain("Complément d'adresse : Bât A");
  });

  it('should add plaignant_adresse_complement to commentaire when plaignant_type is null', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: null,
      plaignant_adresse_complement: 'Bât A',
    });

    expect(result?.commentaire).toBe("Complément d'adresse : Bât A");
  });

  it('should not add complement to commentaire when plaignant_adresse_complement is null', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant_type: 22, plaignant_adresse_complement: null });

    expect(result?.commentaire).not.toContain("Complément d'adresse");
  });

  it('should create declarant from plaignant_adresse_complement alone (physical)', () => {
    expect(
      transformSirecDeclarant({
        ...reclamation,
        plaignant_type: 24,
        plaignant_adresse: null,
        plaignant_adresse_complement: 'Bât A',
      }),
    ).not.toBeNull();
  });

  it('should map requerant_adresse to adresse.rue for physical person', () => {
    expect(
      transformSirecDeclarant({ ...reclamation, plaignant_type: 24, requerant_adresse: '15 avenue Victor Hugo' })
        ?.adresse?.rue,
    ).toBe('15 avenue Victor Hugo');
  });

  it('should concatenate plaignant_adresse and requerant_adresse into rue for physical person', () => {
    expect(
      transformSirecDeclarant({
        ...reclamation,
        plaignant_type: 24,
        plaignant_adresse: '12 rue de la Paix',
        requerant_adresse: 'Bât A',
      })?.adresse?.rue,
    ).toBe('12 rue de la Paix Bât A');
  });

  it('should map requerant_cp to adresse.codePostal for physical person', () => {
    expect(
      transformSirecDeclarant({
        ...reclamation,
        plaignant_type: 24,
        requerant_adresse: '1 rue X',
        requerant_cp: '75001',
      })?.adresse?.codePostal,
    ).toBe('75001');
  });

  it('should map requerant_ville to adresse.ville for physical person', () => {
    expect(
      transformSirecDeclarant({
        ...reclamation,
        plaignant_type: 24,
        requerant_adresse: '1 rue X',
        requerant_ville: 'Paris',
      })?.adresse?.ville,
    ).toBe('Paris');
  });

  it('should create adresse from requerant_cp alone (physical person)', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_type: 24, requerant_cp: '75001' })?.adresse).toEqual({
      rue: null,
      codePostal: '75001',
      ville: null,
    });
  });

  it('should concatenate requerant_adresse, requerant_cp, requerant_ville in commentaire for non-physical', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 22,
      requerant_adresse: '12 rue de la Paix',
      requerant_cp: '75001',
      requerant_ville: 'Paris',
    });

    expect(result?.adresse).toBeNull();
    expect(result?.commentaire).toContain('Adresse : 12 rue de la Paix 75001 Paris');
  });

  it('should concatenate only non-null requerant fields in commentaire for non-physical', () => {
    expect(
      transformSirecDeclarant({ ...reclamation, plaignant_type: null, requerant_cp: '75001', requerant_ville: 'Paris' })
        ?.commentaire,
    ).toBe('Adresse : 75001 Paris');
  });

  it('should return null when all requerant address fields are null (non-physical)', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_type: null })).toBeNull();
  });

  it('should create declarant from plaignant_nom alone', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_nom: 'Dupont' })).not.toBeNull();
  });

  it('should add "Plus de 2 réclamations déposées : oui" to commentaire when plaignant_connu=1', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant_connu: 1 });

    expect(result?.commentaire).toBe('Plus de 2 réclamations déposées : oui');
  });

  it('should not add plaignant_connu line to commentaire when plaignant_connu=0', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant: 34, plaignant_connu: 0 })?.commentaire).toBe('');
  });

  it('should not add plaignant_connu line to commentaire when plaignant_connu is null', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant: 34, plaignant_connu: null })?.commentaire).toBe('');
  });

  it('should create declarant from plaignant_connu=1 alone', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant_connu: 1 })).not.toBeNull();
  });

  it('should combine plaignant_connu and plaignant_est_anonyme in commentaire', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant_est_anonyme: 1, plaignant_connu: 1 });

    expect(result?.commentaire).toBe('Le requérant est anonyme : oui\nPlus de 2 réclamations déposées : oui');
  });

  it('should use requerant_adresse_complete in rue when requerant_adresse is null (physical person)', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 24,
      requerant_adresse: null,
      requerant_adresse_complete: '15 avenue Victor Hugo',
    });

    expect(result?.adresse?.rue).toBe('15 avenue Victor Hugo');
  });

  it('should prefer requerant_adresse over requerant_adresse_complete when both are set (physical person)', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: 24,
      requerant_adresse: '12 rue de la Paix',
      requerant_adresse_complete: 'Adresse complète ignorée',
    });

    expect(result?.adresse?.rue).toBe('12 rue de la Paix');
  });

  it('should map victime_lien_plaignant=46 to lienVictimeId MEMBRE_FAMILLE', () => {
    expect(transformSirecDeclarant({ ...reclamation, victime_lien_plaignant: 46 })?.lienVictimeId).toBe(
      'MEMBRE_FAMILLE',
    );
  });

  it('should map victime_lien_plaignant=107 to lienVictimeId AUTRE', () => {
    expect(transformSirecDeclarant({ ...reclamation, victime_lien_plaignant: 107 })?.lienVictimeId).toBe('AUTRE');
  });

  it('should set lienVictimeId to null when victime_lien_plaignant is null', () => {
    expect(transformSirecDeclarant({ ...reclamation, plaignant: 36 })?.lienVictimeId).toBeNull();
  });

  it('should create declarant from victime_lien_plaignant alone', () => {
    expect(transformSirecDeclarant({ ...reclamation, victime_lien_plaignant: 46 })).not.toBeNull();
  });

  it('should set lienAutrePrecision from lien_plai_autre', () => {
    expect(
      transformSirecDeclarant({ ...reclamation, victime_lien_plaignant: 107, lien_plai_autre: 'Voisin' })
        ?.lienAutrePrecision,
    ).toBe('Voisin');
  });

  it('should set lienAutrePrecision to null when lien_plai_autre is null', () => {
    expect(transformSirecDeclarant({ ...reclamation, victime_lien_plaignant: 107 })?.lienAutrePrecision).toBeNull();
  });

  it('should create declarant from lien_plai_autre alone', () => {
    expect(transformSirecDeclarant({ ...reclamation, lien_plai_autre: 'Voisin' })).not.toBeNull();
  });

  it('should map signalement=1 to estSignalementProfessionnel true', () => {
    expect(transformSirecDeclarant({ ...reclamation, signalement: 1 })?.estSignalementProfessionnel).toBe(true);
  });

  it('should map signalement=0 to estSignalementProfessionnel false', () => {
    expect(transformSirecDeclarant({ ...reclamation, signalement: 0 })?.estSignalementProfessionnel).toBe(false);
  });

  it('should map null signalement to null estSignalementProfessionnel', () => {
    expect(
      transformSirecDeclarant({ ...reclamation, plaignant: 34, signalement: null })?.estSignalementProfessionnel,
    ).toBeNull();
  });

  it('should create declarant from signalement alone', () => {
    expect(transformSirecDeclarant({ ...reclamation, signalement: 1 })).not.toBeNull();
  });

  it('should set estSignalementProfessionnel true even when estVictime is true', () => {
    const result = transformSirecDeclarant({ ...reclamation, plaignant: 34, signalement: 1 });

    expect(result).toEqual({
      estVictime: true,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: '',
      estSignalementProfessionnel: true,
    });
  });

  it('should throw SirecTranscoError for an unknown signalement value', () => {
    expect(() => transformSirecDeclarant({ ...reclamation, signalement: 99999 })).toThrow(SirecTranscoError);
  });

  it('should not use requerant_adresse_complete for non-physical person (only used in rue)', () => {
    const result = transformSirecDeclarant({
      ...reclamation,
      plaignant_type: null,
      requerant_adresse: null,
      requerant_adresse_complete: '15 avenue Victor Hugo',
    });

    expect(result).toBeNull();
  });
  it('should return null when all 4 fields are null', () => {
    expect(transformDeclarantIdentite(reclamation as never)).toBeNull();
  });

  it('should map plaignant_nom to nom', () => {
    expect(transformDeclarantIdentite({ ...reclamation, plaignant_nom: 'Dupont' } as never)?.nom).toBe('Dupont');
  });

  it('should map plaignant_prenom to prenom', () => {
    expect(transformDeclarantIdentite({ ...reclamation, plaignant_prenom: 'Jean' } as never)?.prenom).toBe('Jean');
  });

  it('should map plaignant_mail to email', () => {
    expect(transformDeclarantIdentite({ ...reclamation, plaignant_mail: 'jean@example.com' } as never)?.email).toBe(
      'jean@example.com',
    );
  });

  it('should map plaignant_tel to telephone', () => {
    expect(transformDeclarantIdentite({ ...reclamation, plaignant_tel: '0612345678' } as never)?.telephone).toBe(
      '0612345678',
    );
  });

  it('should keep null for absent fields when at least one field is set', () => {
    expect(transformDeclarantIdentite({ ...reclamation, plaignant_nom: 'Dupont' } as never)).toEqual({
      nom: 'Dupont',
      prenom: null,
      email: null,
      telephone: null,
      civiliteId: null,
    });
  });

  it('should map all 4 fields when all are set', () => {
    expect(
      transformDeclarantIdentite({
        ...reclamation,
        plaignant_nom: 'Dupont',
        plaignant_prenom: 'Jean',
        plaignant_mail: 'jean@example.com',
        plaignant_tel: '0612345678',
      } as never),
    ).toEqual({ nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com', telephone: '0612345678', civiliteId: null });
  });

  it('should always return civiliteId as null (declarant has no civilite)', () => {
    expect(transformDeclarantIdentite({ ...reclamation, plaignant_nom: 'Dupont' } as never)?.civiliteId).toBeNull();
  });
});
