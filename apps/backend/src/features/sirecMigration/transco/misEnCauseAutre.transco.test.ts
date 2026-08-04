import { describe, expect, it } from 'vitest';
import { buildAutrePrecision, transcodeAutresMcType } from './misEnCauseAutre.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('transcodeAutresMcType', () => {
  it('should return null type and precision when autresMcType is null', () => {
    expect(transcodeAutresMcType(null)).toEqual({ misEnCauseTypeId: null, misEnCauseTypePrecisionId: null });
  });

  it('should return AUTRE_PROFESSIONNEL / ACUPUNCTEUR for 120', () => {
    const result = transcodeAutresMcType(120);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBe('ACUPUNCTEUR');
  });

  it('should return AUTRE_PROFESSIONNEL / CHIROPRACTEUR for 121', () => {
    const result = transcodeAutresMcType(121);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBe('CHIROPRACTEUR');
  });

  it('should return AUTRE_PROFESSIONNEL / OSTEOPATHE for 125', () => {
    const result = transcodeAutresMcType(125);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBe('OSTEOPATHE');
  });

  it('should return AUTRE_PROFESSIONNEL / PSYCHOTHERAPEUTE for 127', () => {
    const result = transcodeAutresMcType(127);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBe('PSYCHOTHERAPEUTE');
  });

  it('should return AUTRE_PROFESSIONNEL / TATOUEUR for 129', () => {
    const result = transcodeAutresMcType(129);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBe('TATOUEUR');
  });

  it('should return AUTRE_PROFESSIONNEL with null precision for 122', () => {
    const result = transcodeAutresMcType(122);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBeNull();
  });

  it('should return AUTRE_PROFESSIONNEL with null precision for 131', () => {
    const result = transcodeAutresMcType(131);
    expect(result.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
    expect(result.misEnCauseTypePrecisionId).toBeNull();
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
