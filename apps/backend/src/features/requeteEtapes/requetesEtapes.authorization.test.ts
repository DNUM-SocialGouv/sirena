import { describe, expect, it } from 'vitest';
import { requeteEtapeAuthorization } from './requetesEtapes.authorization.js';

describe('requeteEtapeAuthorization', () => {
  const ownerEntiteId = 'owner-entite';

  it.each([
    { relationship: 'owner', viewerEntiteId: ownerEntiteId, estPartagee: false, canRead: true, canWrite: true },
    { relationship: 'owner', viewerEntiteId: ownerEntiteId, estPartagee: true, canRead: true, canWrite: true },
    { relationship: 'non-owner', viewerEntiteId: 'other-entite', estPartagee: false, canRead: false, canWrite: false },
    { relationship: 'non-owner', viewerEntiteId: 'other-entite', estPartagee: true, canRead: false, canWrite: false },
  ])(
    'keeps $relationship access unchanged when estPartagee is $estPartagee',
    ({ viewerEntiteId, estPartagee, canRead, canWrite }) => {
      const step = { entiteId: ownerEntiteId, estPartagee };

      expect(requeteEtapeAuthorization.canRead(viewerEntiteId, step)).toBe(canRead);
      expect(requeteEtapeAuthorization.canWrite(viewerEntiteId, step)).toBe(canWrite);
    },
  );
});
