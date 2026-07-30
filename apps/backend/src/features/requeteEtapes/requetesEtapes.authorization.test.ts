import { describe, expect, it } from 'vitest';
import { requeteEtapeAuthorization } from './requetesEtapes.authorization.js';

describe('requeteEtapeAuthorization', () => {
  const ownerEntiteId = 'owner-entite';

  it.each([
    {
      relationship: 'owner',
      viewerEntiteId: ownerEntiteId,
      estPartagee: false,
      estPartageeEnabled: false,
      canRead: true,
      canWrite: true,
    },
    {
      relationship: 'owner',
      viewerEntiteId: ownerEntiteId,
      estPartagee: true,
      estPartageeEnabled: true,
      canRead: true,
      canWrite: true,
    },
    {
      relationship: 'non-owner',
      viewerEntiteId: 'other-entite',
      estPartagee: false,
      estPartageeEnabled: true,
      canRead: false,
      canWrite: false,
    },
    {
      relationship: 'non-owner with sharing disabled',
      viewerEntiteId: 'other-entite',
      estPartagee: true,
      estPartageeEnabled: false,
      canRead: false,
      canWrite: false,
    },
    {
      relationship: 'non-owner with sharing enabled',
      viewerEntiteId: 'other-entite',
      estPartagee: true,
      estPartageeEnabled: true,
      canRead: true,
      canWrite: false,
    },
  ])(
    'allows $relationship according to ownership and sharing',
    ({ viewerEntiteId, estPartagee, estPartageeEnabled, canRead, canWrite }) => {
      const step = { entiteId: ownerEntiteId, estPartagee };

      expect(requeteEtapeAuthorization.canRead(viewerEntiteId, step, estPartageeEnabled)).toBe(canRead);
      expect(requeteEtapeAuthorization.canWrite(viewerEntiteId, step)).toBe(canWrite);
    },
  );
});
