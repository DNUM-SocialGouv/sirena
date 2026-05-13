import { describe, expect, it } from 'vitest';
import { buildClosingContextMessage } from './closingContext';

describe('buildClosingContextMessage', () => {
  it('displays the request reception date instead of the creation date', () => {
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

  it('displays a person concerned as civility last name first name', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      receptionDate: '2024-03-15T00:00:00.000Z',
      situations: [
        {
          misEnCause: {
            civilite: 'Mme',
            nom: 'Durand',
            prenom: 'Alice',
          },
        },
      ],
      otherEntitiesAffected: [],
    });

    expect(message).toContain('avec pour mis en cause Mme Durand Alice.');
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

    expect(message).toContain('Le traitement de la requête sera toujours en cours au ARS Bretagne, DDETS 35.');
  });
});
