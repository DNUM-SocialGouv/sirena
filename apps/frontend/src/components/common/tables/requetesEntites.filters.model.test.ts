import { describe, expect, it } from 'vitest';
import { getRequetesQuickFiltersViewModel } from './requetesEntites.filters.model';

describe('getRequetesQuickFiltersViewModel', () => {
  it('sets isRappelOnly to true when the rappel query is active', () => {
    const vm = getRequetesQuickFiltersViewModel(null, { rappel: true });
    expect(vm.isRappelOnly).toBe(true);
  });

  it('sets isRappelOnly to false when the rappel query is absent', () => {
    const vm = getRequetesQuickFiltersViewModel(null, {});
    expect(vm.isRappelOnly).toBe(false);
  });
});
