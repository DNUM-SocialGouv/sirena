import { describe, expect, it } from 'vitest';
import { buildClosingContextMessage, getActiveOtherEntityNames } from './closingContext';

describe('buildClosingContextMessage', () => {
  it('displays the minimal information sentence with the request number', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      otherEntitiesAffected: [],
    });

    expect(message).toBe(
      "Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête REQ-354.",
    );
  });
});

describe('getActiveOtherEntityNames', () => {
  it('returns other administrative entities still processing the request in API order', () => {
    const names = getActiveOtherEntityNames({
      otherEntitiesAffected: [
        { nomComplet: 'ARS Bretagne', statutId: 'NOUVEAU' },
        { nomComplet: 'DDETS 35', statutId: 'EN_COURS' },
      ],
    });

    expect(names).toEqual(['ARS Bretagne', 'DDETS 35']);
  });

  it('omits other administrative entities that are not active anymore', () => {
    const names = getActiveOtherEntityNames({
      otherEntitiesAffected: [
        { nomComplet: 'ARS Bretagne', statutId: 'CLOTUREE' },
        { nomComplet: 'DDETS 35', statutId: 'TRAITEE' },
      ],
    });

    expect(names).toEqual([]);
  });
});
