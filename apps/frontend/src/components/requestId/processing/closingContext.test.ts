import { describe, expect, it } from 'vitest';
import { buildClosingContextMessage } from './closingContext';

describe('buildClosingContextMessage', () => {
  it('displays the minimal information sentence with the request number', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      otherEntitiesAffected: [],
    });

    expect(message).toBe('Information : vous allez clôturer la requête REQ-354.');
  });

  it('appends the other administrative entities still processing the request', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      receptionDate: '2024-03-15T00:00:00.000Z',
      situations: [{ misEnCause: { nom: 'EHPAD Les Lilas' } }],
      otherEntitiesAffected: [
        { nomComplet: 'ARS Bretagne', statutId: 'NOUVEAU' },
        { nomComplet: 'DDETS 35', statutId: 'EN_COURS' },
      ],
    });

    expect(message).toBe(
      "Information : vous allez clôturer la requête REQ-354. Le traitement de la requête sera toujours en cours pour l'entité administrative ARS Bretagne, DDETS 35.",
    );
  });

  it('omits the continuation sentence when other administrative entities are not active anymore', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      receptionDate: '2024-03-15T00:00:00.000Z',
      situations: [{ misEnCause: { nom: 'EHPAD Les Lilas' } }],
      otherEntitiesAffected: [
        { nomComplet: 'ARS Bretagne', statutId: 'CLOTUREE' },
        { nomComplet: 'DDETS 35', statutId: 'TRAITEE' },
      ],
    });

    expect(message).toBe('Information : vous allez clôturer la requête REQ-354.');
  });
});
