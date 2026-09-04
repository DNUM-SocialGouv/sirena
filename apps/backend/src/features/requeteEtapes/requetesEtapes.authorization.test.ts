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
      const step = {
        entiteId: ownerEntiteId,
        estPartagee,
        type: 'MANUAL',
        statutId: 'A_FAIRE',
        acknowledgmentSendMode: null,
      };

      expect(requeteEtapeAuthorization.canRead(viewerEntiteId, step, estPartageeEnabled)).toBe(canRead);
      expect(requeteEtapeAuthorization.canWrite(viewerEntiteId, step)).toBe(canWrite);
    },
  );

  it('allows the owner to read an assignment but rejects writes', () => {
    const assignment = {
      entiteId: ownerEntiteId,
      estPartagee: true,
      type: 'ASSIGNMENT',
      statutId: 'FAIT',
      acknowledgmentSendMode: null,
    };

    expect(requeteEtapeAuthorization.canRead(ownerEntiteId, assignment, false)).toBe(true);
    expect(requeteEtapeAuthorization.canWrite(ownerEntiteId, assignment)).toBe(false);
  });

  it('rejects writes to an automatically sent acknowledgment owned by the viewer perimeter', () => {
    expect(
      requeteEtapeAuthorization.canWrite(ownerEntiteId, {
        entiteId: ownerEntiteId,
        estPartagee: true,
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode: 'AUTOMATIC',
      }),
    ).toBe(false);
  });

  it('rejects writes to a pending acknowledgment from an automatic request before its send mode is recorded', () => {
    expect(
      requeteEtapeAuthorization.canWrite(ownerEntiteId, {
        entiteId: ownerEntiteId,
        estPartagee: false,
        type: 'ACKNOWLEDGMENT',
        statutId: 'A_FAIRE',
        acknowledgmentSendMode: null,
        requete: { dematSocialId: 123, sirecId: null, thirdPartyAccountId: null },
      }),
    ).toBe(false);
  });
});
