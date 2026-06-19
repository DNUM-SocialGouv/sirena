import { describe, expect, it } from 'vitest';
import { transcodeClotureReason } from './cloture.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('cloture.transco.ts', () => {
  it('should return null when idSirec is null', () => {
    expect(transcodeClotureReason(null)).toBeNull();
  });

  it('should transcode 794 to AUTRE', () => {
    expect(transcodeClotureReason(794)).toBe('AUTRE');
  });

  it('should transcode 796 to ABSENCE_DE_RETOUR', () => {
    expect(transcodeClotureReason(796)).toBe('ABSENCE_DE_RETOUR');
  });

  it('should transcode 116 to HORS_COMPETENCE', () => {
    expect(transcodeClotureReason(116)).toBe('HORS_COMPETENCE');
  });

  it('should transcode 802 to MISSION_D_INSPECTION_ET_CONTROLE', () => {
    expect(transcodeClotureReason(802)).toBe('MISSION_D_INSPECTION_ET_CONTROLE');
  });

  it('should transcode 798 to REPONSE_APPORTEE_PAR_SERVICE_INSTRUCTEUR', () => {
    expect(transcodeClotureReason(798)).toBe('REPONSE_APPORTEE_PAR_SERVICE_INSTRUCTEUR');
  });

  it('should transcode 800 to REPONSE_APPORTEE_PAR_MIS_EN_CAUSE', () => {
    expect(transcodeClotureReason(800)).toBe('REPONSE_APPORTEE_PAR_MIS_EN_CAUSE');
  });

  it('should transcode 115 to SANS_SUITE', () => {
    expect(transcodeClotureReason(115)).toBe('SANS_SUITE');
  });

  it('should throw SirecTranscoError for unknown id', () => {
    expect(() => transcodeClotureReason(99999)).toThrow(SirecTranscoError);
  });
});
