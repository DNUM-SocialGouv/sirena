import { ROLES } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { getActiveTab, getTabPaths, getTabs } from './-tabs';

describe('tabs', () => {
  it('shows the entites tab as the third tab for super admins', () => {
    expect(getTabs(ROLES.SUPER_ADMIN).map((tab) => tab.label)).toEqual([
      "Demandes d'habilitation",
      'Utilisateurs',
      'Entités',
    ]);
  });

  it('shows local Entités and Directions et services for root-level entity admins when the feature flag is enabled', () => {
    expect(getTabs(ROLES.ENTITY_ADMIN, false, true, true).map((tab) => tab.label)).toEqual([
      "Demandes d'habilitation",
      'Utilisateurs',
      'Entités',
      'Directions et services',
    ]);
    expect(getTabPaths(ROLES.ENTITY_ADMIN, false, true, true)).toEqual([
      '/admin/users',
      '/admin/users/all',
      '/admin/entite',
      '/admin/directions-services',
    ]);
    expect(getActiveTab('/admin/entite', ROLES.ENTITY_ADMIN, false, true, true)).toBe(2);
    expect(getActiveTab('/admin/directions-services', ROLES.ENTITY_ADMIN, false, true, true)).toBe(3);
  });

  it('shows directions and services instead of global entites for entity admins when the feature flag is enabled', () => {
    expect(getTabs(ROLES.ENTITY_ADMIN, false, true).map((tab) => tab.label)).toEqual([
      "Demandes d'habilitation",
      'Utilisateurs',
      'Directions et services',
    ]);
  });

  it('hides directions and services for entity admins when the feature flag is disabled', () => {
    expect(getTabs(ROLES.ENTITY_ADMIN, false, false, true).map((tab) => tab.label)).toEqual([
      "Demandes d'habilitation",
      'Utilisateurs',
    ]);
  });

  it('returns the matching tab paths for super admins', () => {
    expect(getTabPaths(ROLES.SUPER_ADMIN)).toEqual(['/admin/users', '/admin/users/all', '/admin/entites']);
  });

  it('returns the matching tab paths for entity admins when the feature flag is enabled', () => {
    expect(getTabPaths(ROLES.ENTITY_ADMIN, false, true)).toEqual([
      '/admin/users',
      '/admin/users/all',
      '/admin/directions-services',
    ]);
  });

  it('marks /admin/users as the first tab', () => {
    expect(getActiveTab('/admin/users', ROLES.SUPER_ADMIN)).toBe(0);
  });

  it('marks /admin/users/all as the second tab', () => {
    expect(getActiveTab('/admin/users/all', ROLES.SUPER_ADMIN)).toBe(1);
  });

  it('marks /admin/entites as the third tab for super admins', () => {
    expect(getActiveTab('/admin/entites', ROLES.SUPER_ADMIN)).toBe(2);
  });

  it('marks /admin/entites/:entityId as the third tab for super admins', () => {
    expect(getActiveTab('/admin/entites/root-ars', ROLES.SUPER_ADMIN)).toBe(2);
  });

  it('marks /admin/directions-services as the third tab for entity admins when the feature flag is enabled', () => {
    expect(getActiveTab('/admin/directions-services', ROLES.ENTITY_ADMIN, false, true)).toBe(2);
  });

  it('marks /admin/directions-services/ as the third tab for entity admins when the feature flag is enabled', () => {
    expect(getActiveTab('/admin/directions-services/', ROLES.ENTITY_ADMIN, false, true)).toBe(2);
  });

  it('falls back to the first tab for entity admins on global entites paths', () => {
    expect(getActiveTab('/admin/entites', ROLES.ENTITY_ADMIN)).toBe(0);
  });
});
