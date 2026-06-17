import { describe, expect, it, vi } from 'vitest';
import { transformSirecRpps } from './sirecMigration.rpps.transformer.js';

vi.mock('../../transco/misEnCauseRpps.transco.js', () => ({
  transcodeCiviliteRpps: vi.fn((v: string | null) => (v === 'mme' ? 'MME' : v === 'm' ? 'M' : '')),
  transcodeLibelleProfRpps: vi.fn(() => ({
    misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
    misEnCauseTypePrecisionId: 'PROF_SANTE',
  })),
}));

const rppsData = {
  id_data: 12345678901,
  rpps: '12345678901',
  civilite: 'mme',
  nom: 'Martin',
  prenom: 'Alice',
  code_postal: '76000',
  commune: 'Rouen',
  libelle_prof: 'Médecin',
};

describe('sirecMigration.rpps.transformer.ts', () => {
  it('should return kind rpps', () => {
    expect(transformSirecRpps(rppsData).kind).toBe('rpps');
  });

  it('should map rpps field from sire_rpps_data.rpps', () => {
    expect(transformSirecRpps(rppsData).rpps).toBe('12345678901');
  });

  it('should use empty string when rpps is null', () => {
    expect(transformSirecRpps({ ...rppsData, rpps: null }).rpps).toBe('');
  });

  it('should transcode civilite via transcodeCiviliteRpps', () => {
    expect(transformSirecRpps(rppsData).civilite).toBe('MME');
  });

  it('should map nom and prenom', () => {
    const result = transformSirecRpps(rppsData);
    expect(result.nom).toBe('Martin');
    expect(result.prenom).toBe('Alice');
  });

  it('should use empty string for null nom', () => {
    expect(transformSirecRpps({ ...rppsData, nom: null }).nom).toBe('');
  });

  it('should use empty string for null prenom', () => {
    expect(transformSirecRpps({ ...rppsData, prenom: null }).prenom).toBe('');
  });

  it('should map code_postal and commune', () => {
    const result = transformSirecRpps(rppsData);
    expect(result.codePostal).toBe('76000');
    expect(result.ville).toBe('Rouen');
  });

  it('should pass null codePostal and ville through', () => {
    const result = transformSirecRpps({ ...rppsData, code_postal: null, commune: null });
    expect(result.codePostal).toBeNull();
    expect(result.ville).toBeNull();
  });

  it('should set misEnCauseTypeId and misEnCauseTypePrecisionId from libelle_prof transco', () => {
    const result = transformSirecRpps(rppsData);
    expect(result.misEnCauseTypeId).toBe('PROFESSIONNEL_SANTE');
    expect(result.misEnCauseTypePrecisionId).toBe('PROF_SANTE');
  });
});
