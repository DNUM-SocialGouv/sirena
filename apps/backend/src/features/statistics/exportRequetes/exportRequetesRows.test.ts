import { describe, expect, it } from 'vitest';

import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import type { ExportRequetesCsvRow } from './exportRequetesCsv.js';
import { buildExportRequetesRows } from './exportRequetesRows.js';

describe('buildExportRequetesRows', () => {
  it('builds one CSV row for one requête with one situation', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{}],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
    expect(cell(rows[0], 'numeroRequete')).toBe('REQ-2026-0001');
    expect(cell(rows[0], 'numeroSituation')).toBe(1);
    expect(cell(rows[0], 'dateCreationRequeteSirena')).toBe('18/06/2026');
  });

  it('populates request, declarant, personne concernée, reception and provenance fields', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0004',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        receptionDate: new Date('2026-06-17T10:00:00.000Z'),
        dateDemandeDeclarant: new Date('2026-06-16T10:00:00.000Z'),
        receptionType: { label: 'Téléphone' },
        provenance: { label: 'Demat.social' },
        declarant: {
          estVictime: false,
          lienVictime: { label: 'Autre' },
          lienAutrePrecision: 'Voisin',
          isTuteur: true,
          adresse: { codePostal: '75001' },
          veutGarderAnonymat: false,
          estSignalementProfessionnel: true,
        },
        participant: {
          identite: { civilite: { label: 'Madame' } },
          age: null,
          dateNaissance: new Date('1980-04-12T00:00:00.000Z'),
          adresse: { codePostal: '69002' },
          veutGarderAnonymat: true,
          estVictimeInformee: false,
          mesureProtection: 'MANDATAIRE_FAMILIAL',
          estHandicapee: true,
          aAutrePersonnes: true,
          autrePersonnes: 'Sa sœur',
        },
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'declarantEstPersonneConcernee')).toBe('Non');
    expect(cell(rows[0], 'lienPersonneConcernee')).toBe('Voisin');
    expect(cell(rows[0], 'declarantEstTuteurCurateur')).toBe('Oui');
    expect(cell(rows[0], 'codePostalDeclarant')).toBe('75001');
    expect(cell(rows[0], 'declarantConsentIdentiteCommuniquee')).toBe('Oui');
    expect(cell(rows[0], 'declarantProfessionnelEig')).toBe('Oui');
    expect(cell(rows[0], 'civilitePersonneConcernee')).toBe('Madame');
    expect(cell(rows[0], 'trancheAgePersonneConcernee')).toBe('');
    expect(cell(rows[0], 'anneeNaissancePersonneConcernee')).toBe('1980');
    expect(cell(rows[0], 'codePostalPersonneConcernee')).toBe('69002');
    expect(cell(rows[0], 'personneConcerneeConsentIdentiteCommuniquee')).toBe('Non');
    expect(cell(rows[0], 'personneConcerneeInformeeDemarche')).toBe('Non');
    expect(EXPORT_REQUETES_COLUMNS.find((column) => column.key === 'mesureProtectionPersonneConcernee')?.header).toBe(
      'Mesure de protection de la personne concernée',
    );
    expect(cell(rows[0], 'mesureProtectionPersonneConcernee')).toBe('mandataire familial');
    expect(cell(rows[0], 'personneConcerneeHandicap')).toBe('Oui');
    expect(cell(rows[0], 'autrePersonneConcernee')).toBe('Oui');
    expect(cell(rows[0], 'dateReception')).toBe('17/06/2026');
    expect(cell(rows[0], 'modeReception')).toBe('Téléphone');
    expect(cell(rows[0], 'dateDemandeDeclarant')).toBe('16/06/2026');
    expect(cell(rows[0], 'provenance')).toBe('Demat.social');
  });

  it('uses authoritative departments for declarant and concerned-person postal codes', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-002A',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '20000' },
            veutGarderAnonymat: false,
            estSignalementProfessionnel: false,
          },
          participant: {
            adresse: { codePostal: '20200' },
            veutGarderAnonymat: false,
            estVictimeInformee: false,
            estHandicapee: false,
            aAutrePersonnes: false,
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'ARS Corse', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{ misEnCause: { codePostal: '20000' } }],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departmentCodesByPostalCode: new Map([
          ['20000', '2A'],
          ['20200', '2B'],
        ]),
        departementNamesByCode: new Map([
          ['2A', 'Corse-du-Sud'],
          ['2B', 'Haute-Corse'],
        ]),
      },
    );

    expect(cell(rows[0], 'departementDeclarant')).toBe('Corse-du-Sud (2A)');
    expect(cell(rows[0], 'departementPersonneConcernee')).toBe('Haute-Corse (2B)');
    expect(cell(rows[0], 'departementMisEnCause')).toBe('Corse-du-Sud (2A)');
    expect(EXPORT_REQUETES_COLUMNS.some(({ key }) => key === 'codePostalMisEnCause')).toBe(false);
  });

  it('exports ville déclarant from the declarant address', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0023',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        declarant: {
          estVictime: false,
          isTuteur: false,
          adresse: { codePostal: '75001', ville: 'Paris' },
          veutGarderAnonymat: false,
          estSignalementProfessionnel: false,
        },
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'villeDeclarant')).toBe('Paris');
  });

  it('exports département déclarant as name and code', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0025',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '75001' },
            veutGarderAnonymat: false,
            estSignalementProfessionnel: false,
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{}],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departementNamesByCode: new Map([['75', 'Paris']]),
      },
    );

    expect(cell(rows[0], 'departementDeclarant')).toBe('Paris (75)');
  });

  it('exports ville personne concernée from the participant address', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0024',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        participant: {
          adresse: { codePostal: '69002', ville: 'Lyon' },
          veutGarderAnonymat: false,
          estVictimeInformee: false,
          estHandicapee: false,
          aAutrePersonnes: false,
        },
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'villePersonneConcernee')).toBe('Lyon');
  });

  it('exports département personne concernée as name and code', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0026',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          participant: {
            adresse: { codePostal: '69002' },
            veutGarderAnonymat: false,
            estVictimeInformee: false,
            estHandicapee: false,
            aAutrePersonnes: false,
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{}],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departementNamesByCode: new Map([['69', 'Rhône']]),
      },
    );

    expect(cell(rows[0], 'departementPersonneConcernee')).toBe('Rhône (69)');
  });

  it('exports a Situation-level Entité administrative with its full name', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0038',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            situationEntites: [
              {
                entite: {
                  label: 'ARS NOR',
                  nomComplet: 'Agence régionale de santé de Normandie',
                  entiteMere: null,
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'entitesAdministrativesSituation')).toBe('Agence régionale de santé de Normandie');
  });

  it('exports a Situation-level Direction with its full name and parent short label', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0039',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            situationEntites: [
              {
                entite: {
                  label: 'DIR AUTO',
                  nomComplet: 'Direction de l’autonomie',
                  entiteMere: {
                    label: 'ARS NOR',
                    nomComplet: 'Agence régionale de santé de Normandie',
                    entiteMere: null,
                  },
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'directionsSituation')).toBe('Direction de l’autonomie (ARS NOR)');
  });

  it('exports a Situation-level Service with its full name and parent short label', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0040',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            situationEntites: [
              {
                entite: {
                  label: 'SVC PA',
                  nomComplet: 'Service personnes âgées',
                  entiteMere: {
                    label: 'DIR AUTO',
                    nomComplet: 'Direction de l’autonomie',
                    entiteMere: {
                      label: 'ARS NOR',
                      nomComplet: 'Agence régionale de santé de Normandie',
                      entiteMere: null,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'servicesSituation')).toBe('Service personnes âgées (DIR AUTO)');
  });

  it('exports an inferred Situation Direction with its full name and root short label', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0041',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            situationEntites: [
              {
                entite: {
                  label: 'SVC PA',
                  nomComplet: 'Service personnes âgées',
                  entiteMere: {
                    label: 'DIR AUTO',
                    nomComplet: 'Direction de l’autonomie',
                    entiteMere: {
                      label: 'ARS NOR',
                      nomComplet: 'Agence régionale de santé de Normandie',
                      entiteMere: null,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'directionsSituation')).toBe('Direction de l’autonomie (ARS NOR)');
  });

  it('populates situation entity hierarchy fields', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0009',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            situationEntites: [
              {
                entite: {
                  label: 'ARS Île-de-France',
                  entiteMere: null,
                },
              },
              {
                entite: {
                  label: 'Direction Autonomie',
                  entiteMere: { label: 'ARS Île-de-France', entiteMere: null },
                },
              },
              {
                entite: {
                  label: 'Service PA',
                  entiteMere: {
                    label: 'Direction Autonomie',
                    entiteMere: { label: 'ARS Île-de-France', entiteMere: null },
                  },
                },
              },
              {
                entite: {
                  label: 'Service PA',
                  entiteMere: {
                    label: 'Direction Autonomie',
                    entiteMere: { label: 'ARS Île-de-France', entiteMere: null },
                  },
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'entitesAdministrativesSituation')).toBe('ARS Île-de-France');
    expect(cell(rows[0], 'directionsSituation')).toBe('Direction Autonomie');
    expect(cell(rows[0], 'servicesSituation')).toBe('Service PA');
  });

  it('populates démarches fields and maps contact presence to Oui/Non', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0008',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            demarchesEngagees: {
              dateContactEtablissement: new Date('2026-06-11T00:00:00.000Z'),
              etablissementARepondu: true,
              datePlainte: new Date('2026-06-12T00:00:00.000Z'),
              autoriteType: { label: 'Gendarmerie' },
              demarches: [
                { label: "Démarches engagées auprès d'autres organismes" },
                { label: 'Défenseur des droits' },
              ],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'misEnCauseContacte')).toBe('Oui');
    expect(cell(rows[0], 'datePriseContact')).toBe('11/06/2026');
    expect(cell(rows[0], 'declarantRecuReponse')).toBe('Oui');
    expect(cell(rows[0], 'plainteDeposee')).toBe('Oui');
    expect(cell(rows[0], 'dateDepotPlainte')).toBe('12/06/2026');
    expect(cell(rows[0], 'lieuDepotPlainte')).toBe('Gendarmerie');
    expect(cell(rows[0], 'demarchesAutresOrganismes')).toBe('Oui');
  });

  it('exports Oui when the responsible-contact démarche is selected without a contact date', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0030',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            demarchesEngagees: {
              demarches: [{ label: "L'établissement ou le responsables des faits a été contacté" }],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'misEnCauseContacte')).toBe('Oui');
  });

  it('exports Oui when the complaint démarche is selected without a complaint date or place', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0031',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            demarchesEngagees: {
              demarches: [{ label: 'Une plainte a été déposée auprès des autorités judiciaires' }],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'plainteDeposee')).toBe('Oui');
  });

  it('exports Non for other organizations when only an unrelated démarche is selected', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0032',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            demarchesEngagees: {
              demarches: [{ label: "L'établissement ou le responsables des faits a été contacté" }],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'demarchesAutresOrganismes')).toBe('Non');
  });

  it('exports Non for démarches booleans when the démarches record exists without related data', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0015',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            demarchesEngagees: {
              etablissementARepondu: false,
              demarches: [],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'misEnCauseContacte')).toBe('Non');
    expect(cell(rows[0], 'declarantRecuReponse')).toBe('Non');
    expect(cell(rows[0], 'plainteDeposee')).toBe('Non');
    expect(cell(rows[0], 'demarchesAutresOrganismes')).toBe('Non');
  });

  it('exports an empty declarant-response value when the stored response is unknown', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0033',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            demarchesEngagees: {
              etablissementARepondu: null,
              demarches: [],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'declarantRecuReponse')).toBe('');
  });

  it('populates facts motifs, consequences, dates and functional domain', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0007',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            domainesFonctionnels: { label: 'Santé' },
            faits: [
              {
                dateDebut: new Date('2026-06-12T00:00:00.000Z'),
                dateFin: new Date('2026-06-14T00:00:00.000Z'),
                motifsDeclaratifs: [
                  { motifDeclaratif: { label: 'Violence verbale' } },
                  { motifDeclaratif: { label: 'Négligence' } },
                ],
                motifs: [
                  { motifId: 'QUALITE_SOINS/DELAIS_PRISE_EN_CHARGE', motif: { label: 'Délais de prise en charge' } },
                ],
                consequences: [{ consequence: { label: 'Stress' } }],
              },
              {
                dateDebut: new Date('2026-06-10T00:00:00.000Z'),
                dateFin: new Date('2026-06-16T00:00:00.000Z'),
                motifsDeclaratifs: [{ motifDeclaratif: { label: 'Violence verbale' } }],
                motifs: [
                  { motifId: 'QUALITE_SOINS/DELAIS_PRISE_EN_CHARGE', motif: { label: 'Délais de prise en charge' } },
                  { motif: { label: 'Défaut d’information' } },
                ],
                consequences: [{ consequence: { label: 'Stress' } }, { consequence: { label: 'Blessure' } }],
              },
            ],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'motifsDeclaratifs')).toBe('Violence verbale, Négligence');
    expect(cell(rows[0], 'motifsQualifies')).toBe(
      'Délais de prise en charge (Qualité des soins), Défaut d’information',
    );
    expect(cell(rows[0], 'consequencesPersonneConcernee')).toBe('Stress, Blessure');
    expect(cell(rows[0], 'dateDebutFaits')).toBe('10/06/2026');
    expect(cell(rows[0], 'dateFinFaits')).toBe('16/06/2026');
    expect(cell(rows[0], 'domaineFonctionnel')).toBe('Santé');
  });

  it('exports visible trajet lieu precision', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0028',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              lieuTypeId: 'TRAJET',
              lieuPrecision: 'INTER_ETABLISSEMENT',
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'precisionTypeLieuSurvenue')).toBe('INTER_ETABLISSEMENT');
  });

  it('does not export transport type for trajet because SIRENA detail does not display it', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0029',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              lieuTypeId: 'TRAJET',
              transportType: { label: 'Ambulance' },
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'precisionTypeLieuSurvenue')).toBe('');
  });

  it('prefers the qualified SIRENA postal code for lieu de survenue', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0020',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              codePostal: '33000',
              adresse: { codePostal: '63000' },
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'codePostalLieuSurvenue')).toBe('63000');
  });

  it('keeps the fallback lieu de survenue postal code and city on the declarant source', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0034',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              codePostal: '33000',
              adresse: { codePostal: '', ville: 'Clermont-Ferrand' },
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'codePostalLieuSurvenue')).toBe('33000');
    expect(cell(rows[0], 'villeLieuSurvenue')).toBe('');
  });

  it('exports the structured lieu de survenue postal code and city together', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0022',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              codePostal: '33000',
              adresse: { codePostal: '63000', ville: 'Clermont-Ferrand' },
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'codePostalLieuSurvenue')).toBe('63000');
    expect(cell(rows[0], 'villeLieuSurvenue')).toBe('Clermont-Ferrand');
  });

  it('populates lieu de survenue and non-sensitive mis en cause fields', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0006',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              lieuTypeId: 'ETABLISSEMENT_SANTE',
              lieuType: { label: 'Établissement de santé' },
              lieuPrecision: 'CH',
              transportType: { label: 'Ambulance' },
              codePostal: '',
              adresse: { codePostal: '75013' },
            },
            misEnCause: {
              misEnCauseType: { label: 'Établissement' },
              misEnCauseTypePrecision: { label: 'Service hospitalier' },
              codePostal: '75014',
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'typeLieuSurvenue')).toBe('Établissement de santé');
    expect(cell(rows[0], 'precisionTypeLieuSurvenue')).toBe('CH, Ambulance');
    expect(cell(rows[0], 'codePostalLieuSurvenue')).toBe('75013');
    expect(cell(rows[0], 'typeMisEnCause')).toBe('Établissement');
    expect(cell(rows[0], 'precisionTypeMisEnCause')).toBe('Service hospitalier');
  });

  it('populates department columns for ARS exports from their matching postal-code columns', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0011',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '75001' },
            veutGarderAnonymat: false,
            estSignalementProfessionnel: false,
          },
          participant: {
            adresse: { codePostal: '20167' },
            veutGarderAnonymat: false,
            estVictimeInformee: false,
            estHandicapee: false,
            aAutrePersonnes: false,
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [
            {
              lieuDeSurvenue: { codePostal: '97110' },
              misEnCause: { codePostal: '98000' },
            },
          ],
        },
      ],
      { topEntiteId: 'root-entite' },
    );

    expect(cell(rows[0], 'departementDeclarant')).toBe('75');
    expect(cell(rows[0], 'departementPersonneConcernee')).toBe('20');
    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('971');
    expect(cell(rows[0], 'departementMisEnCause')).toBe('980');
  });

  it('exports département lieu de survenue as name and code from the selected postal code', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0021',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [
            {
              lieuDeSurvenue: {
                codePostal: '33000',
                adresse: { codePostal: '63000' },
              },
            },
          ],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departementNamesByCode: new Map([['63', 'Puy-de-Dôme']]),
      },
    );

    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('Puy-de-Dôme (63)');
  });

  it('derives the lieu de survenue department from its postal code when the referential has no mapping', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0036',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{ lieuDeSurvenue: { codePostal: '97199' } }],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departmentCodesByPostalCode: new Map(),
      },
    );

    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('971');
  });

  it('leaves the lieu de survenue department empty for an invalid postal code', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0037',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{ lieuDeSurvenue: { codePostal: 'Clermont-Ferrand' } }],
        },
      ],
      { topEntiteId: 'root-entite' },
    );

    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('');
  });

  it('exports département mis en cause as name and code', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0027',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [
            {
              misEnCause: { codePostal: '98000' },
            },
          ],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departementNamesByCode: new Map([['980', 'Monaco']]),
      },
    );

    expect(cell(rows[0], 'departementMisEnCause')).toBe('Monaco (980)');
  });

  it('leaves department columns blank for non-ARS exports', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0014',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '75001' },
            veutGarderAnonymat: false,
            estSignalementProfessionnel: false,
          },
          participant: {
            adresse: { codePostal: '69002' },
            veutGarderAnonymat: false,
            estVictimeInformee: false,
            estHandicapee: false,
            aAutrePersonnes: false,
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Conseil départemental', entiteTypeId: 'CD' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [
            {
              lieuDeSurvenue: { codePostal: '97110' },
              misEnCause: { codePostal: '98000' },
            },
          ],
        },
      ],
      { topEntiteId: 'root-entite' },
    );

    expect(cell(rows[0], 'departementDeclarant')).toBe('');
    expect(cell(rows[0], 'departementPersonneConcernee')).toBe('');
    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('');
    expect(cell(rows[0], 'departementMisEnCause')).toBe('');
  });

  it('places department columns immediately after their source/location columns', () => {
    expect(columnAfter('codePostalDeclarant')).toEqual({
      key: 'villeDeclarant',
      header: 'Ville déclarant',
    });
    expect(columnAfter('villeDeclarant')).toEqual({
      key: 'departementDeclarant',
      header: 'Département déclarant',
    });
    expect(columnAfter('codePostalPersonneConcernee')).toEqual({
      key: 'villePersonneConcernee',
      header: 'Ville personne concernée',
    });
    expect(columnAfter('villePersonneConcernee')).toEqual({
      key: 'departementPersonneConcernee',
      header: 'Département personne concernée',
    });
    expect(columnAfter('codePostalLieuSurvenue')).toEqual({
      key: 'villeLieuSurvenue',
      header: 'Ville lieu de survenue',
    });
    expect(columnAfter('villeLieuSurvenue')).toEqual({
      key: 'departementLieuSurvenue',
      header: 'Département lieu de survenue',
    });
    expect(columnAfter('precisionTypeMisEnCause')).toEqual({
      key: 'departementMisEnCause',
      header: 'Département mis en cause',
    });
  });

  it('exports the root-scoped request status in the status column', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0010',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'ARS Île-de-France' },
              statut: { label: 'Clôturée' },
            },
            {
              entiteId: 'other-root',
              entite: { label: 'ARS Normandie' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{}],
        },
      ],
      { topEntiteId: 'root-entite' },
    );

    expect(cell(rows[0], 'statutRequeteEntiteAdministrative')).toBe('Clôturée');
  });

  it('exports a request-level Direction with its full name, parent short label, and request status', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0042',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        requeteEntites: [
          {
            entiteId: 'root-entite',
            entite: {
              label: 'DIR AUTO',
              nomComplet: 'Direction de l’autonomie',
              entiteTypeId: 'DIRECTION',
              entiteMere: {
                label: 'ARS NOR',
                nomComplet: 'Agence régionale de santé de Normandie',
              },
            },
            statut: { label: 'Clôturée' },
          },
        ],
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'entitesStatutsRequete')).toBe('Direction de l’autonomie (ARS NOR) (Clôturée)');
  });

  it('populates request entity status, root-scoped priority and latest root-scoped closure fields', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0005',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'ARS Île-de-France' },
              statut: { label: 'Clôturée' },
              priorite: { label: 'Haute' },
            },
            {
              entiteId: 'other-root',
              entite: { label: 'ARS Normandie' },
              statut: { label: 'En cours' },
              priorite: { label: 'Basse' },
            },
          ],
          etapes: [
            {
              entiteId: 'root-entite',
              statutId: 'CLOTUREE',
              createdAt: new Date('2026-06-17T10:00:00.000Z'),
              clotureEffectiveDate: new Date('2026-06-15T00:00:00.000Z'),
              clotureReason: [{ label: 'Hors compétence' }],
            },
            {
              entiteId: 'root-entite',
              statutId: 'CLOTUREE',
              createdAt: new Date('2026-06-19T10:00:00.000Z'),
              clotureEffectiveDate: new Date('2026-06-18T00:00:00.000Z'),
              clotureReason: [{ label: 'Réponse apportée' }, { label: 'Doublon' }],
            },
            {
              entiteId: 'other-root',
              statutId: 'CLOTUREE',
              createdAt: new Date('2026-06-20T10:00:00.000Z'),
              clotureEffectiveDate: new Date('2026-06-20T00:00:00.000Z'),
              clotureReason: [{ label: 'Autre entité' }],
            },
          ],
          situations: [{}],
        },
      ],
      { topEntiteId: 'root-entite' },
    );

    expect(cell(rows[0], 'entitesStatutsRequete')).toBe('ARS Île-de-France (Clôturée), ARS Normandie (En cours)');
    expect(cell(rows[0], 'prioriteRequeteEntiteAdministrative')).toBe('Haute');
    expect(cell(rows[0], 'derniereDateClotureEntiteAdministrative')).toBe('18/06/2026');
    expect(cell(rows[0], 'raisonsClotureEntiteAdministrative')).toBe('Réponse apportée, Doublon');
  });

  it('builds one CSV row per situation and repeats request-level fields', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0002',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{}, {}],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(cell(rows[0], 'numeroRequete')).toBe('REQ-2026-0002');
    expect(cell(rows[0], 'numeroSituation')).toBe(1);
    expect(cell(rows[0], 'dateCreationRequeteSirena')).toBe('18/06/2026');
    expect(cell(rows[1], 'numeroRequete')).toBe('REQ-2026-0002');
    expect(cell(rows[1], 'numeroSituation')).toBe(2);
    expect(cell(rows[1], 'dateCreationRequeteSirena')).toBe('18/06/2026');
  });

  it('builds one CSV row with empty situation fields for a requête without situation', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0003',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
    expect(cell(rows[0], 'numeroRequete')).toBe('REQ-2026-0003');
    expect(cell(rows[0], 'numeroSituation')).toBe('');
    expect(cell(rows[0], 'dateCreationRequeteSirena')).toBe('18/06/2026');
  });
});

function cell(row: ExportRequetesCsvRow, key: ExportRequetesColumnKey): ExportRequetesCsvRow[number] {
  const index = EXPORT_REQUETES_COLUMNS.findIndex((column) => column.key === key);

  return row[index];
}

function columnAfter(key: ExportRequetesColumnKey): (typeof EXPORT_REQUETES_COLUMNS)[number] | undefined {
  const index = EXPORT_REQUETES_COLUMNS.findIndex((column) => column.key === key);

  return EXPORT_REQUETES_COLUMNS[index + 1];
}
