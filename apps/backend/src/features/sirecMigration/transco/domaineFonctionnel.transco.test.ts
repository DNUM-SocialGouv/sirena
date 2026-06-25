import { describe, expect, it } from 'vitest';
import { transcodeDomaineFonctionnel } from './domaineFonctionnel.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('domaineFonctionnel.transco.ts', () => {
  it('should return null when idSirec is null', () => {
    expect(transcodeDomaineFonctionnel(null)).toBeNull();
  });

  it('should return null for id 113 (valeur à ignorer)', () => {
    expect(transcodeDomaineFonctionnel(113)).toBeNull();
  });

  it('should transcode known ids to SIRENA domainesFonctionnelsId', () => {
    expect(transcodeDomaineFonctionnel(114)).toBe('AMBULATOIRE_GENERAL');
    expect(transcodeDomaineFonctionnel(78)).toBe('AMBULATOIRE_TRANSPORT_SANITAIRE');
    expect(transcodeDomaineFonctionnel(80)).toBe('DEFAUT_OFFRE_SOINS_CAS_CRITIQUE');
    expect(transcodeDomaineFonctionnel(81)).toBe('DEFAUT_OFFRE_SOINS_GENERAL');
    expect(transcodeDomaineFonctionnel(83)).toBe('HOSPITALISATIONS_CONTRAINTE');
    expect(transcodeDomaineFonctionnel(84)).toBe('MEDICO_SOCIAL_HANDICAPES_ADULTES');
    expect(transcodeDomaineFonctionnel(85)).toBe('MEDICO_SOCIAL_HANDICAPES_ENFANTS');
    expect(transcodeDomaineFonctionnel(86)).toBe('MEDICO_SOCIAL_PA');
    expect(transcodeDomaineFonctionnel(87)).toBe('PHARMACIES_LABORATOIRES');
    expect(transcodeDomaineFonctionnel(88)).toBe('SANITAIRE');
    expect(transcodeDomaineFonctionnel(592)).toBe('SANTE_ENVIRONNEMENT');
  });

  it('should transcode ids 79 and 82 to AUTRES', () => {
    expect(transcodeDomaineFonctionnel(79)).toBe('AUTRES');
    expect(transcodeDomaineFonctionnel(82)).toBe('AUTRES');
  });

  it('should throw SirecTranscoError for an unknown idSirec', () => {
    expect(() => transcodeDomaineFonctionnel(9999)).toThrow(SirecTranscoError);
  });

  it('should include the unknown idSirec and table name in the error', () => {
    try {
      transcodeDomaineFonctionnel(9999);
    } catch (err) {
      expect(err).toBeInstanceOf(SirecTranscoError);
      expect((err as SirecTranscoError).idDico).toBe(9999);
      expect((err as SirecTranscoError).tableName).toBe('domaine');
    }
  });
});
