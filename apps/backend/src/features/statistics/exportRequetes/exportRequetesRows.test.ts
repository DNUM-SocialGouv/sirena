import { describe, expect, it } from 'vitest';

import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import { buildExportRequetesRows, type ExportRequetesCsvRow } from './exportRequetesRows.js';

describe('buildExportRequetesRows', () => {
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
          veutGarderAnonymat: 'NON',
          estSignalementProfessionnel: 'OUI',
        },
        participant: {
          identite: { civilite: { label: 'Madame' } },
          age: null,
          dateNaissance: new Date('1980-04-12T00:00:00.000Z'),
          adresse: { codePostal: '69002' },
          veutGarderAnonymat: 'OUI',
          estVictimeInformee: 'NON',
          mesureProtection: 'MANDATAIRE_FAMILIAL',
          estHandicapee: 'OUI',
          aAutrePersonnes: 'OUI',
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
    expect(cell(rows[0], 'dateNaissancePersonneConcernee')).toBe('12/04/1980');
    expect(cell(rows[0], 'codePostalPersonneConcernee')).toBe('69002');
    expect(cell(rows[0], 'personneConcerneeConsentIdentiteCommuniquee')).toBe('Non');
    expect(cell(rows[0], 'personneConcerneeInformeeDemarche')).toBe('Non');
    expect(cell(rows[0], 'mesureProtectionPersonneConcernee')).toBe('Mandataire familial');
    expect(cell(rows[0], 'personneConcerneeHandicap')).toBe('Oui');
    expect(cell(rows[0], 'autrePersonneConcernee')).toBe('Oui');
    expect(cell(rows[0], 'precisionsAutresPersonnesConcernees')).toBe('Sa sœur');
    expect(cell(rows[0], 'dateReception')).toBe('17/06/2026');
    expect(cell(rows[0], 'modeReception')).toBe('Téléphone');
    expect(cell(rows[0], 'dateDemandeDeclarant')).toBe('16/06/2026');
    expect(cell(rows[0], 'provenance')).toBe('Demat.social');
  });

  it.each([
    ['MANDATAIRE_JUDICIAIRE', 'Mandataire judiciaire'],
    ['MANDATAIRE_FAMILIAL', 'Mandataire familial'],
    ['NON', 'Non'],
    ['NON_RENSEIGNE', 'Non renseigné'],
    [null, ''],
  ])('exports the protection measure %s with the label of the form', (mesureProtection, label) => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0100',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        participant: { mesureProtection },
        situations: [{}],
      } as never,
    ]);

    expect(cell(rows[0], 'mesureProtectionPersonneConcernee')).toBe(label);
  });

  it('exports cities and authoritative departments for every allowed postal source', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-002A',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '20000', ville: 'Ajaccio' },
            veutGarderAnonymat: 'NON',
            estSignalementProfessionnel: 'NON',
          },
          participant: {
            adresse: { codePostal: '20200', ville: 'Bastia' },
            veutGarderAnonymat: 'NON',
            estVictimeInformee: 'NON',
            estHandicapee: 'NON',
            aAutrePersonnes: 'NON',
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'ARS Corse', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [
            {
              lieuDeSurvenue: { adresse: { codePostal: '63000', ville: 'Clermont-Ferrand' } },
              misEnCause: { codePostal: '98000' },
            },
          ],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departmentCodesByPostalCode: new Map([
          ['20000', '2A'],
          ['20200', '2B'],
          ['63000', '63'],
          ['98000', '980'],
        ]),
        departementNamesByCode: new Map([
          ['2A', 'Corse-du-Sud'],
          ['2B', 'Haute-Corse'],
          ['63', 'Puy-de-Dôme'],
          ['980', 'Monaco'],
        ]),
      },
    );

    expect(cell(rows[0], 'villeDeclarant')).toBe('Ajaccio');
    expect(cell(rows[0], 'departementDeclarant')).toBe('Corse-du-Sud (2A)');
    expect(cell(rows[0], 'villePersonneConcernee')).toBe('Bastia');
    expect(cell(rows[0], 'departementPersonneConcernee')).toBe('Haute-Corse (2B)');
    expect(cell(rows[0], 'villeLieuSurvenue')).toBe('Clermont-Ferrand');
    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('Puy-de-Dôme (63)');
    expect(cell(rows[0], 'departementMisEnCause')).toBe('Monaco (980)');
  });

  it('formats and de-duplicates the complete Situation entity hierarchy', () => {
    const rootEntite = {
      label: 'ARS NOR',
      nomComplet: 'Agence régionale de santé de Normandie',
      entiteMere: null,
    };
    const direction = {
      label: 'DIR AUTO',
      nomComplet: 'Direction de l’autonomie',
      entiteMere: rootEntite,
    };
    const service = {
      label: 'SVC PA',
      nomComplet: 'Service personnes âgées',
      entiteMere: direction,
    };
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0038',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            situationEntites: [{ entite: rootEntite }, { entite: direction }, { entite: service }, { entite: service }],
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'entitesAdministrativesSituation')).toBe('Agence régionale de santé de Normandie');
    expect(cell(rows[0], 'directionsSituation')).toBe('Direction de l’autonomie (ARS NOR)');
    expect(cell(rows[0], 'servicesSituation')).toBe('Service personnes âgées (DIR AUTO)');
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
                  { motifId: 'QUALITE_SOINS/DELAIS_PRISE_EN_CHARGE', motif: { label: 'Délai de prise en charge' } },
                ],
                consequences: [{ consequence: { label: 'Stress' } }],
              },
              {
                dateDebut: new Date('2026-06-10T00:00:00.000Z'),
                dateFin: new Date('2026-06-16T00:00:00.000Z'),
                motifsDeclaratifs: [{ motifDeclaratif: { label: 'Violence verbale' } }],
                motifs: [
                  { motifId: 'QUALITE_SOINS/DELAIS_PRISE_EN_CHARGE', motif: { label: 'Délai de prise en charge' } },
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
    expect(cell(rows[0], 'motifsQualifies')).toBe('Délai de prise en charge (Qualité des soins), Défaut d’information');
    expect(cell(rows[0], 'consequencesPersonneConcernee')).toBe('Stress, Blessure');
    expect(cell(rows[0], 'dateDebutFaits')).toBe('10/06/2026');
    expect(cell(rows[0], 'dateFinFaits')).toBe('16/06/2026');
    expect(cell(rows[0], 'domaineFonctionnel')).toBe('Santé');
  });

  it('exports visible lieu precision and demat.social transport type for a trajet', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0028',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              lieuTypeId: 'TRAJET',
              lieuPrecision: 'INTER_ETABLISSEMENT',
              transportType: { label: 'Ambulance' },
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'precisionTypeLieuSurvenue')).toBe('INTER_ETABLISSEMENT, Ambulance');
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

  it('populates lieu de survenue and mis en cause type fields', () => {
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
    expect(cell(rows[0], 'precisionTypeLieuSurvenue')).toBe('CH');
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
            veutGarderAnonymat: 'NON',
            estSignalementProfessionnel: 'NON',
          },
          participant: {
            adresse: { codePostal: '20167' },
            veutGarderAnonymat: 'NON',
            estVictimeInformee: 'NON',
            estHandicapee: 'NON',
            aAutrePersonnes: 'NON',
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

  it('falls back to the SIREC department when the situation has no postal code', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0015',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          // A SIREC request whose mis en cause is an RPPS: its lieu de survenue is empty.
          situations: [{ sirecDepartement: 'Seine-Maritime', lieuDeSurvenue: { codePostal: '' } }],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departementCodesByName: new Map([['Seine-Maritime', '76']]),
        departementNamesByCode: new Map([['76', 'Seine-Maritime']]),
      },
    );

    expect(cell(rows[0], 'codePostalLieuSurvenue')).toBe('');
    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('Seine-Maritime (76)');
  });

  it('prefers the postal code over the SIREC department when both are known', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0016',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          situations: [{ sirecDepartement: 'Seine-Maritime', lieuDeSurvenue: { codePostal: '29200' } }],
        },
      ],
      {
        topEntiteId: 'root-entite',
        departmentCodesByPostalCode: new Map([['29200', '29']]),
        departementCodesByName: new Map([['Seine-Maritime', '76']]),
      },
    );

    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('29');
  });

  it('leaves the department blank when the SIREC label has no counterpart in the referential', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0017',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'En cours' },
            },
          ],
          // SIREC also carries "Autre" and "Saint-Martin et Saint-Barthélemy".
          situations: [{ sirecDepartement: 'Autre', lieuDeSurvenue: { codePostal: '' } }],
        },
      ],
      { topEntiteId: 'root-entite', departementCodesByName: new Map([['Seine-Maritime', '76']]) },
    );

    expect(cell(rows[0], 'departementLieuSurvenue')).toBe('');
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
            veutGarderAnonymat: 'NON',
            estSignalementProfessionnel: 'NON',
          },
          participant: {
            adresse: { codePostal: '69002' },
            veutGarderAnonymat: 'NON',
            estVictimeInformee: 'NON',
            estHandicapee: 'NON',
            aAutrePersonnes: 'NON',
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

  it('formats and de-duplicates request-level affected entities while preserving first-seen order', () => {
    const direction = {
      entiteId: 'direction-1',
      entite: {
        label: 'DIR AUTO',
        nomComplet: 'Direction de l’autonomie',
        entiteTypeId: 'DIRECTION',
        entiteMere: { label: 'ARS NOR' },
      },
      statut: { label: 'Clôturée' },
    };
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0043',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        requeteEntites: [
          direction,
          direction,
          {
            entiteId: 'service-1',
            entite: {
              label: 'SVC PA',
              nomComplet: 'Service personnes âgées',
              entiteTypeId: 'SERVICE',
              entiteMere: { label: 'DIR AUTO' },
            },
            statut: { label: 'En cours' },
          },
        ],
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'entitesStatutsRequete')).toBe(
      'Direction de l’autonomie (ARS NOR) (Clôturée), Service personnes âgées (DIR AUTO) (En cours)',
    );
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

    expect(cell(rows[0], 'statutRequeteEntiteAdministrative')).toBe('Clôturée');
    expect(cell(rows[0], 'entitesStatutsRequete')).toBe('ARS Île-de-France (Clôturée), ARS Normandie (En cours)');
    expect(cell(rows[0], 'prioriteRequeteEntiteAdministrative')).toBe('Haute');
    expect(cell(rows[0], 'derniereDateClotureEntiteAdministrative')).toBe('18/06/2026');
    expect(cell(rows[0], 'raisonsClotureEntiteAdministrative')).toBe('Réponse apportée, Doublon');
  });

  it('exports the clear identity, contact details and comments of the declarant and the personne concernée', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0010',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        declarant: {
          estVictime: false,
          isTuteur: false,
          identite: {
            civilite: { label: 'Monsieur' },
            nom: 'Martin',
            prenom: 'Paul',
            email: 'paul.martin@example.fr',
            telephone: '0601020304',
          },
          adresse: { codePostal: '75001', ville: 'Paris', numero: '12', rue: 'rue de Rivoli' },
          veutGarderAnonymat: 'OUI',
          estSignalementProfessionnel: 'NON',
          commentaire: 'Joignable le matin',
        },
        participant: {
          identite: {
            civilite: { label: 'Madame' },
            nom: 'Martin',
            prenom: 'Jeanne',
            email: 'jeanne.martin@example.fr',
            telephone: '0605060708',
          },
          adresse: { codePostal: '69002', ville: 'Lyon', numero: '', rue: 'quai Saint-Antoine' },
          veutGarderAnonymat: 'NON',
          estVictimeInformee: 'NON',
          victimeInformeeCommentaire: 'Hospitalisée',
          estHandicapee: 'NON',
          aAutrePersonnes: 'NON',
          autrePersonnes: 'Texte resté en base',
          commentaire: 'Sous tutelle depuis 2024',
        },
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'civiliteDeclarant')).toBe('Monsieur');
    expect(cell(rows[0], 'nomDeclarant')).toBe('Martin');
    expect(cell(rows[0], 'prenomDeclarant')).toBe('Paul');
    expect(cell(rows[0], 'emailDeclarant')).toBe('paul.martin@example.fr');
    expect(cell(rows[0], 'telephoneDeclarant')).toBe('0601020304');
    expect(cell(rows[0], 'adresseDeclarant')).toBe('12 rue de Rivoli');
    expect(cell(rows[0], 'villeDeclarant')).toBe('Paris');
    // The identity is exported even when the declarant asked to keep it from the mis en cause.
    expect(cell(rows[0], 'declarantConsentIdentiteCommuniquee')).toBe('Non');
    expect(cell(rows[0], 'autresPrecisionsDeclarant')).toBe('Joignable le matin');
    expect(cell(rows[0], 'nomPersonneConcernee')).toBe('Martin');
    expect(cell(rows[0], 'prenomPersonneConcernee')).toBe('Jeanne');
    expect(cell(rows[0], 'emailPersonneConcernee')).toBe('jeanne.martin@example.fr');
    expect(cell(rows[0], 'telephonePersonneConcernee')).toBe('0605060708');
    expect(cell(rows[0], 'adressePersonneConcernee')).toBe('quai Saint-Antoine');
    expect(cell(rows[0], 'raisonPersonneConcerneeNonInformee')).toBe('Hospitalisée');
    // Same rule as the requête PDF: the free text only counts when the answer is "Oui".
    expect(cell(rows[0], 'precisionsAutresPersonnesConcernees')).toBe('');
    expect(cell(rows[0], 'autresPrecisionsPersonneConcernee')).toBe('Sous tutelle depuis 2024');
  });

  it('exports the clear mis en cause, place, facts and file names of a situation', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0011',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            estLieAuSignalement: 'OUI',
            numerosSignalement: 'SIG-1, SIG-2',
            lieuDeSurvenue: {
              lieuType: { label: 'Établissement de santé' },
              finess: '750000001',
              societeTransport: '',
              categLib: 'Centre hospitalier',
              adresse: { codePostal: '75013', ville: 'Paris', numero: '47', rue: 'boulevard de l’Hôpital', label: '' },
            },
            misEnCause: {
              misEnCauseType: { label: 'Professionnel de santé' },
              civilite: 'MME',
              nom: 'Durand',
              prenom: 'Claire',
              rpps: '10001234567',
              nomService: 'Gériatrie',
              finess: '750000002',
              codePostal: '75013',
              ville: 'Paris',
              autrePrecision: 'Infirmière de nuit',
              commentaire: 'Déjà signalée',
            },
            faits: [
              {
                commentaire: 'Chute non signalée',
                autresPrecisions: 'Témoin présent',
                motifsDeclaratifs: [],
                motifs: [],
                consequences: [],
                maltraitanceTypes: [
                  { maltraitanceTypeId: 'NEGLIGENCES', maltraitanceType: { label: 'Négligences' } },
                  { maltraitanceTypeId: 'NON', maltraitanceType: { label: 'Non' } },
                ],
                fichiers: [
                  { fileName: '3f2a.pdf', metadata: { originalName: 'certificat medical.pdf' } },
                  { fileName: 'photo.jpg', metadata: null },
                ],
              },
            ],
            demarchesEngagees: {
              organisme: 'Défenseur des droits',
              commentaire: 'Courrier envoyé',
              demarches: [],
              etablissementReponse: [{ fileName: 'reponse.pdf', metadata: null }],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'situationLieeSignalement')).toBe('Oui');
    expect(cell(rows[0], 'numerosSignalement')).toBe('SIG-1, SIG-2');
    expect(cell(rows[0], 'nomEtablissementLieuSurvenue')).toBe('Centre hospitalier');
    expect(cell(rows[0], 'finessLieuSurvenue')).toBe('750000001');
    expect(cell(rows[0], 'adresseLieuSurvenue')).toBe('47 boulevard de l’Hôpital');
    expect(cell(rows[0], 'civiliteMisEnCause')).toBe('Mme');
    expect(cell(rows[0], 'nomMisEnCause')).toBe('Durand');
    expect(cell(rows[0], 'prenomMisEnCause')).toBe('Claire');
    expect(cell(rows[0], 'rppsMisEnCause')).toBe('10001234567');
    expect(cell(rows[0], 'nomServiceMisEnCause')).toBe('Gériatrie');
    expect(cell(rows[0], 'finessMisEnCause')).toBe('750000002');
    expect(cell(rows[0], 'codePostalMisEnCause')).toBe('75013');
    expect(cell(rows[0], 'villeMisEnCause')).toBe('Paris');
    expect(cell(rows[0], 'precisionsMisEnCause')).toBe('Infirmière de nuit');
    expect(cell(rows[0], 'commentaireMisEnCause')).toBe('Déjà signalée');
    expect(cell(rows[0], 'typesMaltraitance')).toBe('Négligences');
    expect(cell(rows[0], 'explicationFaits')).toBe('Chute non signalée');
    expect(cell(rows[0], 'autresPrecisionsFaits')).toBe('Témoin présent');
    expect(cell(rows[0], 'organismeContacte')).toBe('Défenseur des droits');
    expect(cell(rows[0], 'commentaireDemarches')).toBe('Courrier envoyé');
    expect(cell(rows[0], 'piecesJointesSituation')).toBe('certificat medical.pdf, photo.jpg, reponse.pdf');
  });

  it('exports the requête original details and the names of its original files', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0012',
        // 00:30 in Paris on 1 July: the creation day is the Paris one, like the period filter.
        createdAt: new Date('2026-06-30T22:30:00.000Z'),
        provenancePrecision: 'Mairie',
        dematSocialId: 123456,
        sirecId: null,
        fichiersRequeteOriginale: [{ fileName: 'abc.pdf', metadata: { originalName: 'formulaire.pdf' } }],
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'dateCreationRequeteSirena')).toBe('01/07/2026');
    expect(cell(rows[0], 'precisionProvenance')).toBe('Mairie');
    expect(cell(rows[0], 'numeroDematSocial')).toBe(123456);
    expect(cell(rows[0], 'numeroSirec')).toBe('');
    expect(cell(rows[0], 'piecesJointesRequeteOriginale')).toBe('formulaire.pdf');
  });

  it('exports the SIREC number of a migrated requête', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0013',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        sirecId: 98765,
        situations: [{}],
      },
    ]);

    expect(cell(rows[0], 'numeroSirec')).toBe(98765);
  });

  it('gathers every processing step in one cell, oldest first, with status, files, closure and notes', () => {
    const rows = buildExportRequetesRows(
      [
        {
          id: 'REQ-2026-0013',
          createdAt: new Date('2026-06-01T08:00:00.000Z'),
          requeteEntites: [
            { entiteId: 'root-entite', entite: { label: 'ARS IDF' }, statut: { label: 'Clôturée' } },
            {
              entiteId: 'other-root',
              entite: { label: 'CD 75', nomComplet: 'Conseil départemental de Paris' },
              statut: { label: 'En cours' },
            },
          ],
          etapes: [
            {
              entiteId: 'root-entite',
              type: 'MANUAL',
              statutId: 'CLOTUREE',
              statut: { label: 'Clôturée' },
              nom: 'Clôture',
              createdAt: new Date('2026-06-20T10:00:00.000Z'),
              clotureEffectiveDate: new Date('2026-06-19T00:00:00.000Z'),
              clotureReason: [{ label: 'Réponse apportée' }],
              uploadedFiles: [{ fileName: 'x.pdf', metadata: { originalName: 'courrier de cloture.pdf' } }],
              notes: [
                {
                  texte: 'Dossier clos\naprès réponse',
                  createdAt: new Date('2026-06-20T10:00:00.000Z'),
                  author: { prenom: 'Jean-Pierre', nom: 'de La Fontaine' },
                },
              ],
            },
            {
              entiteId: 'root-entite',
              type: 'CREATION',
              statutId: 'FAIT',
              statut: { label: 'Fait' },
              nom: 'Création',
              createdAt: new Date('2026-06-01T08:00:00.000Z'),
              clotureReason: [],
              notes: [],
            },
            {
              entiteId: 'other-root',
              type: 'MANUAL',
              statutId: 'A_FAIRE',
              statut: { label: 'À faire' },
              nom: 'Visite sur place',
              createdAt: new Date('2026-06-10T08:00:00.000Z'),
              dateRealisation: new Date('2026-06-12T00:00:00.000Z'),
              clotureReason: [],
              notes: [{ texte: 'Note automatique', createdAt: new Date('2026-06-10T08:00:00.000Z'), author: null }],
            },
          ],
          situations: [{}],
        },
      ],
      { topEntiteId: 'root-entite' },
    );

    expect(cell(rows[0], 'etapesTraitement')).toBe(
      [
        '01/06/2026 Création de la requête - Statut : Fait',
        '10/06/2026 [Conseil départemental de Paris] Visite sur place - Statut : À faire - Date de réalisation : 12/06/2026 - Note du 10/06/2026 par Système : Note automatique',
        '19/06/2026 Clôture - Statut : Clôturée - Motif(s) de clôture : Réponse apportée - Pièces jointes : courrier de cloture.pdf - Note du 20/06/2026 par Jean-Pierre de La Fontaine : Dossier clos après réponse',
      ].join(' | '),
    );
  });

  it('flattens line breaks and cuts a cell before the Excel limit', () => {
    const longComment = `Début\r\nsuite ${'x'.repeat(40_000)}`;
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0014',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        declarant: {
          estVictime: false,
          isTuteur: false,
          veutGarderAnonymat: 'NON',
          estSignalementProfessionnel: 'NON',
          commentaire: longComment,
        },
        situations: [{}],
      },
    ]);

    const value = String(cell(rows[0], 'autresPrecisionsDeclarant'));
    expect(value.startsWith('Début suite x')).toBe(true);
    expect(value).not.toMatch(/[\r\n]/);
    expect(value.length).toBe(32_000);
    expect(value.endsWith('(texte tronqué)')).toBe(true);
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
    expect(rows[0]).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
    expect(rows[1]).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
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
