import { describe, expect, it } from 'vitest';
import { getAdminLocalAssignmentLevel, groupEntitesByParentId } from './entites.hierarchy.js';

describe('getAdminLocalAssignmentLevel', () => {
  it('classifies root, Direction, Service, and invalid hierarchy affectations from their parent chain', () => {
    const entites = [
      { id: 'root-ars', entiteMereId: null },
      { id: 'direction-autonomie', entiteMereId: 'root-ars' },
      { id: 'service-pa', entiteMereId: 'direction-autonomie' },
      { id: 'unexpected-child', entiteMereId: 'service-pa' },
      { id: 'orphan', entiteMereId: 'missing-parent' },
    ];
    const entitesById = new Map(entites.map((entite) => [entite.id, entite]));

    expect(getAdminLocalAssignmentLevel(entites[0], entitesById)).toBe('entite-administrative');
    expect(getAdminLocalAssignmentLevel(entites[1], entitesById)).toBe('direction');
    expect(getAdminLocalAssignmentLevel(entites[2], entitesById)).toBe('service');
    expect(getAdminLocalAssignmentLevel(entites[3], entitesById)).toBe('invalid-hierarchy');
    expect(getAdminLocalAssignmentLevel(entites[4], entitesById)).toBe('invalid-hierarchy');
  });
});

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
