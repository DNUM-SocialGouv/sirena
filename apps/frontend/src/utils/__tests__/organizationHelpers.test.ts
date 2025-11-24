import { describe, expect, it } from 'vitest';
import {
  buildOrganizationAddress,
  extractOrganizationName,
  type OrganizationAddress,
  updateOrganizationName,
} from '../organizationHelpers';

describe('organizationHelpers', () => {
  describe('extractOrganizationName', () => {
    it('should extract name from address object', () => {
      const address: OrganizationAddress = {
        label: 'Hôpital Saint-Antoine',
        codePostal: '75012',
        ville: 'Paris',
      };
      expect(extractOrganizationName(address)).toBe('Hôpital Saint-Antoine');
    });

    it('should return empty string when address is undefined', () => {
      expect(extractOrganizationName(undefined)).toBe('');
    });

    it('should return empty string when label is undefined', () => {
      const address: OrganizationAddress = {
        codePostal: '75012',
        ville: 'Paris',
      };
      expect(extractOrganizationName(address)).toBe('');
    });

    it('should return label even without postal code and city', () => {
      const address: OrganizationAddress = {
        label: 'Hôpital Saint-Antoine',
      };
      expect(extractOrganizationName(address)).toBe('Hôpital Saint-Antoine');
    });
  });

  describe('buildOrganizationAddress', () => {
    it('should build full address with postal code and city', () => {
      const result = buildOrganizationAddress('Hôpital Saint-Antoine', '75012', 'Paris');
      expect(result).toEqual({
        label: 'Hôpital Saint-Antoine',
        codePostal: '75012',
        ville: 'Paris',
      });
    });

    it('should build address with only name when postal code is missing', () => {
      const result = buildOrganizationAddress('Hôpital Saint-Antoine', undefined, 'Paris');
      expect(result).toEqual({
        label: 'Hôpital Saint-Antoine',
        codePostal: undefined,
        ville: 'Paris',
      });
    });

    it('should build address with only name when city is missing', () => {
      const result = buildOrganizationAddress('Hôpital Saint-Antoine', '75012', undefined);
      expect(result).toEqual({
        label: 'Hôpital Saint-Antoine',
        codePostal: '75012',
        ville: undefined,
      });
    });

    it('should build address with only name when both postal code and city are missing', () => {
      const result = buildOrganizationAddress('Hôpital Saint-Antoine', undefined, undefined);
      expect(result).toEqual({
        label: 'Hôpital Saint-Antoine',
        codePostal: undefined,
        ville: undefined,
      });
    });

    it('should handle empty strings', () => {
      const result = buildOrganizationAddress('Hôpital Saint-Antoine', '', '');
      expect(result).toEqual({
        label: 'Hôpital Saint-Antoine',
        codePostal: '',
        ville: '',
      });
    });
  });

  describe('updateOrganizationName', () => {
    it('should update name while preserving postal code and city', () => {
      const currentAddress: OrganizationAddress = {
        label: 'Hôpital Saint-Antoine',
        codePostal: '75012',
        ville: 'Paris',
      };
      const result = updateOrganizationName(currentAddress, 'Nouvel Hôpital');
      expect(result).toEqual({
        label: 'Nouvel Hôpital',
        codePostal: '75012',
        ville: 'Paris',
      });
    });

    it('should create new address when current address is undefined', () => {
      const result = updateOrganizationName(undefined, 'Nouvel Hôpital');
      expect(result).toEqual({
        label: 'Nouvel Hôpital',
      });
    });

    it('should update name when current address has no postal code/city', () => {
      const currentAddress: OrganizationAddress = {
        label: 'Hôpital Saint-Antoine',
      };
      const result = updateOrganizationName(currentAddress, 'Nouvel Hôpital');
      expect(result).toEqual({
        label: 'Nouvel Hôpital',
      });
    });

    it('should preserve all fields when updating name', () => {
      const currentAddress: OrganizationAddress = {
        label: 'Hôpital Saint-Antoine',
        codePostal: '75012',
        ville: 'Paris',
      };
      const result = updateOrganizationName(currentAddress, 'Nouvel Hôpital');
      expect(result).toEqual({
        label: 'Nouvel Hôpital',
        codePostal: '75012',
        ville: 'Paris',
      });
    });
  });
});
