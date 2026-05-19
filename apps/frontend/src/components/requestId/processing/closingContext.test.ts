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

  it('uses precision, type, then non renseigné when the concerned person or establishment has no name', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      receptionDate: '2024-03-15T00:00:00.000Z',
      situations: [
        {
          misEnCause: {
            misEnCauseTypePrecision: { label: 'Service hospitalier' },
            misEnCauseType: { label: 'Établissement' },
          },
        },
        {
          misEnCause: {
            misEnCauseType: { label: 'Professionnel' },
          },
        },
        {
          misEnCause: {},
        },
      ],
      otherEntitiesAffected: [],
    });

    expect(message).toContain('avec pour mis en cause Service hospitalier, Professionnel, non renseigné.');
  });

  it('deduplicates concerned person or establishment labels across situations', () => {
    const message = buildClosingContextMessage({
      requestId: 'REQ-354',
      receptionDate: '2024-03-15T00:00:00.000Z',
      situations: [
        { misEnCause: { nom: 'EHPAD Les Lilas' } },
        { misEnCause: { nom: 'EHPAD Les Lilas' } },
        { misEnCause: { nom: 'Clinique du Centre' } },
      ],
      otherEntitiesAffected: [],
    });

    expect(message).toContain('avec pour mis en cause EHPAD Les Lilas, Clinique du Centre.');
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

    expect(message).toBe(
      'Vous allez clôturer la requête REQ-354 reçue le 15/03/2024 avec pour mis en cause EHPAD Les Lilas.',
    );
  });
});
