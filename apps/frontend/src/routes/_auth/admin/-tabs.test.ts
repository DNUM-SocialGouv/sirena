import { ROLES } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { getActiveTab, getTabPaths, getTabs } from './-tabs';

describe('tabs', () => {
  it('shows the entities tab as the third tab for super admins', () => {
    expect(getTabs(ROLES.SUPER_ADMIN).map((tab) => tab.label)).toEqual([
      "Gestion des demandes d'habilitations",
      'Gestion des utilisateurs',
      'Gestion des entités',
    ]);
  });

  it('does not show the entities tab for entity admins', () => {
    expect(getTabs(ROLES.ENTITY_ADMIN).map((tab) => tab.label)).toEqual([
      "Gestion des demandes d'habilitations",
      'Gestion des utilisateurs',
    ]);
  });

  it('returns the matching tab paths for super admins', () => {
    expect(getTabPaths(ROLES.SUPER_ADMIN)).toEqual(['/admin/users', '/admin/users/all', '/admin/entities']);
  });

  it('returns the matching tab paths for entity admins', () => {
    expect(getTabPaths(ROLES.ENTITY_ADMIN)).toEqual(['/admin/users', '/admin/users/all']);
  });

  it('marks /admin/users as the first tab', () => {
    expect(getActiveTab('/admin/users', ROLES.SUPER_ADMIN)).toBe(0);
  });

  it('marks /admin/users/all as the second tab', () => {
    expect(getActiveTab('/admin/users/all', ROLES.SUPER_ADMIN)).toBe(1);
  });

  it('marks /admin/entities as the third tab for super admins', () => {
    expect(getActiveTab('/admin/entities', ROLES.SUPER_ADMIN)).toBe(2);
  });

  it('marks /admin/entities/:entityId as the third tab for super admins', () => {
    expect(getActiveTab('/admin/entities/root-ars', ROLES.SUPER_ADMIN)).toBe(2);
  });

  it('falls back to the first tab for entity admins on unknown admin paths', () => {
    expect(getActiveTab('/admin/entities', ROLES.ENTITY_ADMIN)).toBe(0);
  });
});
