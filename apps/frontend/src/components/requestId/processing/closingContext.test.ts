import { describe, expect, it } from 'vitest';
import { buildClosingContextMessage } from './closingContext';

describe('buildClosingContextMessage', () => {
  it('affiche la date de réception de la requête, pas sa date de création', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      receptionDate: '2024-03-15T00:00:00.000Z',
      createdAt: '2024-01-10T00:00:00.000Z',
      situations: [
        {
          misEnCause: {
            nom: 'EHPAD Les Lilas',
          },
        },
      ],
      otherEntitiesAffected: [],
    });

    expect(message).toContain('Vous allez clôturer la requête REQ-354 reçue le 15/03/2024');
    expect(message).not.toContain('10/01/2024');
  });
});
