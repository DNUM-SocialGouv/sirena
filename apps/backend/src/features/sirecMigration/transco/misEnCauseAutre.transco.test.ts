import { describe, expect, it } from 'vitest';
import { buildAutrePrecision, transcodeAutresMcType } from './misEnCauseAutre.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('transcodeAutresMcType', () => {
  it('should return null when autresMcType is null', () => {
    expect(transcodeAutresMcType(null)).toBeNull();
  });

  it('should map professional values to a mis en cause "Autre professionnel" with its precision', () => {
    expect(transcodeAutresMcType(120)).toEqual({
      kind: 'misEnCause',
      misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
      misEnCauseTypePrecisionId: 'ACUPUNCTEUR',
    });
    expect(transcodeAutresMcType(121)).toEqual({
      kind: 'misEnCause',
      misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
      misEnCauseTypePrecisionId: 'CHIROPRACTEUR',
    });
    expect(transcodeAutresMcType(125)).toEqual({
      kind: 'misEnCause',
      misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
      misEnCauseTypePrecisionId: 'OSTEOPATHE',
    });
    expect(transcodeAutresMcType(129)).toEqual({
      kind: 'misEnCause',
      misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
      misEnCauseTypePrecisionId: 'TATOUEUR',
    });
  });

  it('should map "Exercice illégal" to the new "Autre professionnel" precision', () => {
    expect(transcodeAutresMcType(123)).toEqual({
      kind: 'misEnCause',
      misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
      misEnCauseTypePrecisionId: 'EXERCICE_ILLEGAL',
    });
  });

  it('should map "Autre" to the AUTRE mis en cause type', () => {
    expect(transcodeAutresMcType(131)).toEqual({
      kind: 'misEnCause',
      misEnCauseTypeId: 'AUTRE',
      misEnCauseTypePrecisionId: null,
    });
  });

  it('should route location-bound values to a lieu instead of a mis en cause', () => {
    expect(transcodeAutresMcType(122)).toEqual({
      kind: 'lieu',
      lieuTypeId: 'ETABLISSEMENT_FICTIF',
      lieuPrecisionId: null,
    });
    expect(transcodeAutresMcType(124)).toEqual({
      kind: 'lieu',
      lieuTypeId: 'AUTRES_ETABLISSEMENTS',
      lieuPrecisionId: 'MAISON_ARRET',
    });
    expect(transcodeAutresMcType(130)).toEqual({
      kind: 'lieu',
      lieuTypeId: 'TRAJET',
      lieuPrecisionId: 'TRANSPORTEUR_SANITAIRE',
    });
  });

  it('should throw SirecTranscoError for unknown autresMcType', () => {
    expect(() => transcodeAutresMcType(999)).toThrow(SirecTranscoError);
  });
});

describe('buildAutrePrecision', () => {
  it('should use the dictionnaire label for autresMcType', () => {
    const result = buildAutrePrecision(120, 'Dr Martin', '1 rue de la Paix');
    expect(result).toContain('Type de mis en cause : Acuponcteur');
  });

  it('should use "Autre" when autresMcType is null', () => {
    const result = buildAutrePrecision(null, 'Dr Martin', '1 rue de la Paix');
    expect(result).toContain('Type de mis en cause : Autre');
  });

  it('should include label in nom/structure line', () => {
    const result = buildAutrePrecision(125, 'Dupont Ostéo', null);
    expect(result).toContain('Nom / structure : Dupont Ostéo');
  });

  it('should use "Non renseigné" when label is null', () => {
    const result = buildAutrePrecision(125, null, null);
    expect(result).toContain('Nom / structure : Non renseigné');
  });

  it('should include adresse in adresse line', () => {
    const result = buildAutrePrecision(125, 'Test', '5 avenue des Fleurs 75001 Paris');
    expect(result).toContain('Adresse : 5 avenue des Fleurs 75001 Paris');
  });

  it('should use "Non renseigné" when adresse is null', () => {
    const result = buildAutrePrecision(125, 'Test', null);
    expect(result).toContain('Adresse : Non renseigné');
  });

  it('should produce three lines', () => {
    const result = buildAutrePrecision(129, 'Tatoueur Dupont', '12 rue du Centre');
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
  });
});
