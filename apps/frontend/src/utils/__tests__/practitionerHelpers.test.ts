import { describe, expect, it } from 'vitest';
import type { Practitioner } from '@/lib/api/fetchPractitioners';
import { formatPractitionerName } from '../practitionerHelpers';

describe('practitionerHelpers', () => {
  describe('formatPractitionerName', () => {
    it('should format name with prefix', () => {
      const practitioner: Practitioner = {
        rpps: '12345678901',
        firstName: 'Jean',
        lastName: 'Dupont',
        fullName: 'Jean Dupont',
        prefix: 'Dr',
      };
      expect(formatPractitionerName(practitioner)).toBe('Dr Jean Dupont');
    });

    it('should format name without prefix', () => {
      const practitioner: Practitioner = {
        rpps: '12345678901',
        firstName: 'Jean',
        lastName: 'Dupont',
        fullName: 'Jean Dupont',
        prefix: '',
      };
      expect(formatPractitionerName(practitioner)).toBe('Jean Dupont');
    });

    it('should handle empty prefix', () => {
      const practitioner: Practitioner = {
        rpps: '12345678901',
        firstName: 'Jean',
        lastName: 'Dupont',
        fullName: 'Jean Dupont',
        prefix: '',
      };
      expect(formatPractitionerName(practitioner)).toBe('Jean Dupont');
    });

    it('should handle complex names', () => {
      const practitioner: Practitioner = {
        rpps: '12345678901',
        firstName: 'Marie-Claire',
        lastName: 'de la Fontaine',
        fullName: 'Marie-Claire de la Fontaine',
        prefix: 'Pr',
      };
      expect(formatPractitionerName(practitioner)).toBe('Pr Marie-Claire de la Fontaine');
    });
  });
});
