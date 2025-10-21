import { describe, expect, it } from 'vitest';
import { parseAdresseDomicile } from './address';

describe('parseAdresseDomicile', () => {
  describe('when address has number and street', () => {
    it('should parse address with number and street correctly', () => {
      const result = parseAdresseDomicile('123 Rue de la Paix');

      expect(result).toEqual({
        numero: '123',
        rue: 'Rue de la Paix',
      });
    });

    it('should parse address with multiple digits number', () => {
      const result = parseAdresseDomicile('4567 Avenue des Champs-Élysées');

      expect(result).toEqual({
        numero: '4567',
        rue: 'Avenue des Champs-Élysées',
      });
    });

    it('should handle extra spaces in street name', () => {
      const result = parseAdresseDomicile('42  Rue Victor Hugo  ');

      expect(result).toEqual({
        numero: '42',
        rue: 'Rue Victor Hugo',
      });
    });
  });

  describe('when address has no number', () => {
    it('should return empty number and full address as street', () => {
      const result = parseAdresseDomicile('Rue de la République');

      expect(result).toEqual({
        numero: '',
        rue: 'Rue de la République',
      });
    });

    it('should handle address starting with non-numeric character', () => {
      const result = parseAdresseDomicile('{Avenue du Général de Gaulle');

      expect(result).toEqual({
        numero: '',
        rue: '{Avenue du Général de Gaulle',
      });
    });
  });

  describe('when address is empty or invalid', () => {
    it('should return empty values for empty string', () => {
      const result = parseAdresseDomicile('');

      expect(result).toEqual({
        numero: '',
        rue: '',
      });
    });

    it('should return empty values for whitespace only', () => {
      const result = parseAdresseDomicile('   ');

      expect(result).toEqual({
        numero: '',
        rue: '',
      });
    });

    it('should return empty values for null input', () => {
      const result = parseAdresseDomicile(null as unknown as string);

      expect(result).toEqual({
        numero: '',
        rue: '',
      });
    });

    it('should return empty values for undefined input', () => {
      const result = parseAdresseDomicile(undefined as unknown as string);

      expect(result).toEqual({
        numero: '',
        rue: '',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle address with only number', () => {
      const result = parseAdresseDomicile('123');

      expect(result).toEqual({
        numero: '',
        rue: '123',
      });
    });

    it('should handle address with number followed by multiple spaces', () => {
      const result = parseAdresseDomicile('123    Rue de la Paix');

      expect(result).toEqual({
        numero: '123',
        rue: 'Rue de la Paix',
      });
    });

    it('should handle address with special characters in street name', () => {
      const result = parseAdresseDomicile("15 Rue de l'Église");

      expect(result).toEqual({
        numero: '15',
        rue: "Rue de l'Église",
      });
    });

    it('should handle address with numbers in street name', () => {
      const result = parseAdresseDomicile('8 Rue du 8 Mai 1945');

      expect(result).toEqual({
        numero: '8',
        rue: 'Rue du 8 Mai 1945',
      });
    });
  });
});
