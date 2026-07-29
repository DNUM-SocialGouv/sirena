import { describe, expect, it } from 'vitest';
import { extractFinessFromRawText, extractPostalCode } from './utils.js';

describe('utils.ts', () => {
  describe('extractPostalCode', () => {
    describe('when input contains a valid 5-digit postal code', () => {
      it.each([
        ['75001', '75001'],
        ['76000', '76000'],
        ['13001', '13001'],
        ['69001', '69001'],
        ['33000', '33000'],
      ])('should extract postal code from standalone value: %s', (input, expected) => {
        expect(extractPostalCode(input)).toBe(expected);
      });

      it('should extract postal code from text with postal code', () => {
        expect(extractPostalCode('Paris 75001')).toBe('75001');
      });

      it('should extract postal code from text with postal code at the beginning', () => {
        expect(extractPostalCode('75001 Paris')).toBe('75001');
      });

      it('should extract postal code from text with postal code in the middle', () => {
        expect(extractPostalCode('Address in 75001 Paris')).toBe('75001');
      });

      it('should extract first postal code when multiple are present', () => {
        expect(extractPostalCode('75001 and 76000')).toBe('75001');
      });

      it('should not match postal code that is part of a longer number', () => {
        expect(extractPostalCode('1234567890')).toBeNull();
      });

      it('should not match postal code that is part of a longer number at the end', () => {
        expect(extractPostalCode('1234567890123')).toBeNull();
      });

      it('should match postal code that is standalone even with surrounding text', () => {
        expect(extractPostalCode('Code: 75001 Ville: Paris')).toBe('75001');
      });
    });

    describe('when input is null or undefined', () => {
      it('should return null for null input', () => {
        expect(extractPostalCode(null)).toBeNull();
      });

      it('should return null for undefined input', () => {
        expect(extractPostalCode(undefined)).toBeNull();
      });
    });

    describe('when input does not contain a valid postal code', () => {
      it.each([[''], ['no postal code here'], ['1234'], ['123456'], ['ABCDE'], ['12-345'], ['12 345']])(
        'should return null for input without valid postal code: %s',
        (input) => {
          expect(extractPostalCode(input)).toBeNull();
        },
      );
    });
  });

  describe('extractFinessFromRawText', () => {
    describe('when input contains a valid FINESS with Luhn check', () => {
      it('should extract valid FINESS with Luhn check', () => {
        expect(extractFinessFromRawText('750100026')).toBe('750100026');
      });

      it('should extract FINESS from text containing it', () => {
        expect(extractFinessFromRawText('FINESS: 750100026')).toBe('750100026');
      });

      it('should extract FINESS with surrounding text', () => {
        expect(extractFinessFromRawText('Establishment FINESS 750100026 in Paris')).toBe('750100026');
      });

      it('should prefer FINESS with valid Luhn check when multiple candidates exist', () => {
        expect(extractFinessFromRawText('750100026 and 123456789')).toBe('750100026');
      });

      it('should handle non-breaking spaces', () => {
        const textWithNbsp = 'FINESS\u00A0750100026';
        expect(extractFinessFromRawText(textWithNbsp)).toBe('750100026');
      });
    });

    describe('when input contains FINESS with valid structure but invalid Luhn', () => {
      it('should extract FINESS when exactly one meets structural rule', () => {
        expect(extractFinessFromRawText('750100000 and 123456789')).toBe('750100000');
      });
    });

    describe('when input contains multiple 9-digit sequences', () => {
      it('should prefer FINESS with valid Luhn check', () => {
        const result = extractFinessFromRawText('750100026 750100000');
        expect(result).toBe('750100026');
      });

      it('should return first valid FINESS when multiple have valid Luhn', () => {
        const result = extractFinessFromRawText('750100026 130100123');
        expect(result).toBe('750100026');
      });

      it('should return null when multiple candidates with valid structure but none with valid Luhn', () => {
        const result = extractFinessFromRawText('750100001 130100002');
        expect(result).toBeNull();
      });
    });

    describe('when input is null or undefined', () => {
      it('should return null for null input', () => {
        expect(extractFinessFromRawText(null)).toBeNull();
      });

      it('should return null for undefined input', () => {
        expect(extractFinessFromRawText(undefined)).toBeNull();
      });
    });

    describe('when input does not contain a valid FINESS', () => {
      it('should return null for empty string', () => {
        expect(extractFinessFromRawText('')).toBeNull();
      });

      it('should return null when no 9-digit sequence exists', () => {
        expect(extractFinessFromRawText('no numbers here')).toBeNull();
      });

      it('should return the 9-digit sequence even with invalid structure when it is the only one (fallback rule)', () => {
        expect(extractFinessFromRawText('123456789')).toBe('123456789');
      });

      it('should return null when 9-digit sequence is part of longer number', () => {
        expect(extractFinessFromRawText('1234567890123')).toBeNull();
      });

      it('should return null when multiple 9-digit sequences but none with valid structure', () => {
        expect(extractFinessFromRawText('123456789 987654321')).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle FINESS at the beginning of text', () => {
        expect(extractFinessFromRawText('750100026 is the FINESS')).toBe('750100026');
      });

      it('should handle FINESS at the end of text', () => {
        expect(extractFinessFromRawText('The FINESS is 750100026')).toBe('750100026');
      });

      it('should handle FINESS with spaces around it', () => {
        expect(extractFinessFromRawText('FINESS:  750100026  ')).toBe('750100026');
      });

      it('should return FINESS when only one 9-digit sequence exists with valid structure', () => {
        expect(extractFinessFromRawText('750100000')).toBe('750100000');
      });

      it('should normalize non-breaking spaces before processing', () => {
        const text = 'FINESS\u00A0:\u00A0750100026';
        expect(extractFinessFromRawText(text)).toBe('750100026');
      });
    });
  });
});
