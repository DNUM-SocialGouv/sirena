import { describe, expect, it } from 'vitest';
import { hasUnsavedChanges } from './hasUnsavedChanges';

describe('hasUnsavedChanges', () => {
  it('ignores the whitespace around a field', () => {
    expect(hasUnsavedChanges({ nom: 'Dupont' }, { nom: '  Dupont  ' })).toBe(false);
  });

  it('ignores a field cleared back to the absent state it was saved in', () => {
    expect(hasUnsavedChanges({}, { nom: '' })).toBe(false);
  });

  it('ignores a list emptied back to the absent state it was saved in', () => {
    expect(hasUnsavedChanges({}, { fait: { consequences: [] } })).toBe(false);
  });

  it('ignores a nested object whose every field was cleared', () => {
    expect(hasUnsavedChanges({}, { fait: { commentaire: '   ', consequences: [] } })).toBe(false);
  });

  it('sees a list the user filled', () => {
    expect(hasUnsavedChanges({}, { fait: { consequences: ['VIOLENCE'] } })).toBe(true);
  });

  it('sees an item dropped from a list', () => {
    expect(hasUnsavedChanges({ consequences: ['VIOLENCE', 'NEGLIGENCE'] }, { consequences: ['VIOLENCE'] })).toBe(true);
  });

  it('sees an added file', () => {
    expect(hasUnsavedChanges({}, { piece: new File(['%PDF'], 'courrier.pdf') })).toBe(true);
  });
});
