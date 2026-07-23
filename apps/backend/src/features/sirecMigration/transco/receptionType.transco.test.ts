import { describe, expect, it } from 'vitest';
import { transcodeReceptionType } from './receptionType.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('receptionType.transco.ts', () => {
  it('should return null when idSirec is null', () => {
    expect(transcodeReceptionType(null)).toBeNull();
  });

  it('should transcode known idSirec values to SIRENA receptionTypeIds', () => {
    expect(transcodeReceptionType(10)).toBe('COURRIER');
    expect(transcodeReceptionType(12)).toBe('EMAIL');
    expect(transcodeReceptionType(14)).toBe('TELEPHONE');
    expect(transcodeReceptionType(803)).toBe('FORMULAIRE');
  });

  it('should transcode SIREC-only reception types to their dedicated SIRENA values', () => {
    expect(transcodeReceptionType(89)).toBe('INFO_MEDIA');
    expect(transcodeReceptionType(338)).toBe('PORTAIL_SIGNALEMENTS');
    expect(transcodeReceptionType(340)).toBe('AUTRE');
    expect(transcodeReceptionType(825)).toBe('SIGNAL_CONSO');
  });

  it('should throw SirecTranscoError for an unknown idSirec', () => {
    expect(() => transcodeReceptionType(9999)).toThrow(SirecTranscoError);
  });

  it('should include the unknown idSirec and table name in the error', () => {
    try {
      transcodeReceptionType(9999);
    } catch (err) {
      expect(err).toBeInstanceOf(SirecTranscoError);
      expect((err as SirecTranscoError).idDico).toBe(9999);
      expect((err as SirecTranscoError).tableName).toBe('receptionType');
    }
  });
});
