import { describe, expect, it } from 'vitest';
import { groupEntitesByParentId } from './entites.hierarchy.js';

describe('groupEntitesByParentId', () => {
  it('groups non-root entites by their parent id while excluding root entites', () => {
    const grouped = groupEntitesByParentId([
      { id: 'root-ars', entiteMereId: null },
      { id: 'direction-autonomie', entiteMereId: 'root-ars' },
      { id: 'direction-sante', entiteMereId: 'root-ars' },
      { id: 'service-pa', entiteMereId: 'direction-autonomie' },
    ]);

    expect(grouped.get('root-ars')?.map((entite) => entite.id)).toEqual(['direction-autonomie', 'direction-sante']);
    expect(grouped.get('direction-autonomie')?.map((entite) => entite.id)).toEqual(['service-pa']);
    expect(grouped.has('root-ars')).toBe(true);
    expect(grouped.has('service-pa')).toBe(false);
  });
});
