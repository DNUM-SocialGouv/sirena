import { describe, expect, it } from 'vitest';
import { getCtcdCodeCandidates, isCtcdEntiteType } from './ctcdMatching.js';

describe('isCtcdEntiteType', () => {
  it('should accept the department-level entity types', () => {
    expect(isCtcdEntiteType('CD')).toBe(true);
    expect(isCtcdEntiteType('DD')).toBe(true);
  });

  it('should reject ARS, which is matched on its region instead', () => {
    expect(isCtcdEntiteType('ARS')).toBe(false);
  });
});

describe('getCtcdCodeCandidates', () => {
  it('should offer both the INSEE collectivite code and the internal convention', () => {
    expect(getCtcdCodeCandidates('76', '76D', 'CD')).toEqual(['76D', '76CD']);
    expect(getCtcdCodeCandidates('76', '76D', 'DD')).toEqual(['76D', '76DD']);
  });

  it('should not duplicate a code when both conventions agree', () => {
    expect(getCtcdCodeCandidates('76', '76DD', 'DD')).toEqual(['76DD']);
  });

  it('should handle the collectivites whose code is not <departement>D', () => {
    expect(getCtcdCodeCandidates('2A', '20R', 'CD')).toEqual(['20R', '2ACD']);
    expect(getCtcdCodeCandidates('69', '69M', 'CD')).toEqual(['69M', '69CD']);
    expect(getCtcdCodeCandidates('75', '75C', 'CD')).toEqual(['75C', '75CD']);
    expect(getCtcdCodeCandidates('67', '6AE', 'DD')).toEqual(['6AE', '67DD']);
    expect(getCtcdCodeCandidates('972', '972R', 'CD')).toEqual(['972R', '972CD']);
  });
});
