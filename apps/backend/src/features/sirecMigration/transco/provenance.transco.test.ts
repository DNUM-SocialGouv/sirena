import { describe, expect, it } from 'vitest';
import { transcodeProvenance } from './provenance.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('provenance.transco.ts', () => {
  it('should return null when idProvenance is null', () => {
    expect(transcodeProvenance(null)).toBeNull();
  });

  it('should transcode known idProvenance values to SIRENA provenanceIds', () => {
    expect(transcodeProvenance(26)).toBe('PREMIER_MINISTRE');
    expect(transcodeProvenance(28)).toBe('ELUS');
    expect(transcodeProvenance(30)).toBe('MINISTERES');
    expect(transcodeProvenance(404)).toBe('ASSURANCE_MALADIE');
    expect(transcodeProvenance(408)).toBe('CONSEILS_ORDRE');
    expect(transcodeProvenance(410)).toBe('CONSEIL_DEPARTEMENTAL');
    expect(transcodeProvenance(416)).toBe('DEFENSEUR_DROITS');
    expect(transcodeProvenance(418)).toBe('IGAS');
    expect(transcodeProvenance(420)).toBe('MINISTERES');
    expect(transcodeProvenance(424)).toBe('PREFECTURE');
    expect(transcodeProvenance(426)).toBe('PRESIDENCE_REPUBLIQUE');
    expect(transcodeProvenance(428)).toBe('PRESIDENCE_AN_SENAT');
    expect(transcodeProvenance(430)).toBe('ASSOCIATIONS_USAGERS');
    expect(transcodeProvenance(804)).toBe('DDETS_DREETS');
    expect(transcodeProvenance(806)).toBe('DDETS_DREETS');
  });

  it('should transcode multiple SIREC ids mapping to the same SIRENA value AUTRE', () => {
    expect(transcodeProvenance(406)).toBe('AUTRE');
    expect(transcodeProvenance(412)).toBe('AUTRE');
    expect(transcodeProvenance(414)).toBe('AUTRE');
    expect(transcodeProvenance(422)).toBe('AUTRE');
    expect(transcodeProvenance(432)).toBe('AUTRE');
    expect(transcodeProvenance(434)).toBe('AUTRE');
    expect(transcodeProvenance(436)).toBe('AUTRE');
  });

  it('should throw SirecTranscoError for an unknown idProvenance', () => {
    expect(() => transcodeProvenance(9999)).toThrow(SirecTranscoError);
  });

  it('should include the unknown idProvenance and table name in the error', () => {
    try {
      transcodeProvenance(9999);
    } catch (err) {
      expect(err).toBeInstanceOf(SirecTranscoError);
      expect((err as SirecTranscoError).idDico).toBe(9999);
      expect((err as SirecTranscoError).tableName).toBe('requeteProvenance');
    }
  });
});
