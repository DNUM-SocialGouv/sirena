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
    expect(cell(rows[0], 'autrePersonneConcernee')).toBe('Sa sœur');
    expect(cell(rows[0], 'dateReception')).toBe('17/06/2026');
    expect(cell(rows[0], 'modeReception')).toBe('Téléphone');
    expect(cell(rows[0], 'dateDemandeDeclarant')).toBe('16/06/2026');
    expect(cell(rows[0], 'provenance')).toBe('Demat.social');
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

  it('populates démarches fields and leaves ambiguous boolean columns empty', () => {
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
              demarches: [{ label: 'Conseil départemental' }, { label: 'Défenseur des droits' }],
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'misEnCauseContacte')).toBe('');
    expect(cell(rows[0], 'datePriseContact')).toBe('11/06/2026');
    expect(cell(rows[0], 'declarantRecuReponse')).toBe('');
    expect(cell(rows[0], 'plainteDeposee')).toBe('');
    expect(cell(rows[0], 'dateDepotPlainte')).toBe('12/06/2026');
    expect(cell(rows[0], 'lieuDepotPlainte')).toBe('Gendarmerie');
    expect(cell(rows[0], 'demarchesAutresOrganismes')).toBe('Conseil départemental, Défenseur des droits');
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
                motifs: [{ motif: { label: 'Défaut de prise en charge' } }],
                consequences: [{ consequence: { label: 'Stress' } }],
              },
              {
                dateDebut: new Date('2026-06-10T00:00:00.000Z'),
                dateFin: new Date('2026-06-16T00:00:00.000Z'),
                motifsDeclaratifs: [{ motifDeclaratif: { label: 'Violence verbale' } }],
                motifs: [
                  { motif: { label: 'Défaut de prise en charge' } },
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
    expect(cell(rows[0], 'motifsQualifies')).toBe('Défaut de prise en charge, Défaut d’information');
    expect(cell(rows[0], 'consequencesPersonneConcernee')).toBe('Stress, Blessure');
    expect(cell(rows[0], 'dateDebutFaits')).toBe('10/06/2026');
    expect(cell(rows[0], 'dateFinFaits')).toBe('16/06/2026');
    expect(cell(rows[0], 'domaineFonctionnel')).toBe('Santé');
  });

  it('falls back to transport company for lieu de survenue name when address label is absent', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0013',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              societeTransport: 'Ambulances Dupont',
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'nomLieuSurvenue')).toBe('Ambulances Dupont');
  });

  it('populates lieu de survenue name from the address label', () => {
    const rows = buildExportRequetesRows([
      {
        id: 'REQ-2026-0012',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [
          {
            lieuDeSurvenue: {
              adresse: { codePostal: '75013', label: 'Hôpital Pitié-Salpêtrière' },
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'nomLieuSurvenue')).toBe('Hôpital Pitié-Salpêtrière');
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
              finess: '750000001',
              categLib: 'Centre hospitalier',
              codePostal: '',
              adresse: { codePostal: '75013' },
            },
            misEnCause: {
              misEnCauseType: { label: 'Établissement' },
              misEnCauseTypePrecision: { label: 'Service hospitalier' },
              autrePrecision: 'Autre précision',
              finess: '750000002',
              nomService: 'Urgences',
              codePostal: '75014',
              rpps: '12345678901',
              nom: 'Donnée sensible',
              prenom: 'Donnée sensible',
            },
          },
        ],
      },
    ]);

    expect(cell(rows[0], 'typeLieuSurvenue')).toBe('Établissement de santé');
    expect(cell(rows[0], 'precisionTypeLieuSurvenue')).toBe('CH, Ambulance');
    expect(cell(rows[0], 'finessLieuSurvenue')).toBe('750000001');
    expect(cell(rows[0], 'categorieFinessLieuSurvenue')).toBe('Centre hospitalier');
    expect(cell(rows[0], 'nomLieuSurvenue')).toBe('');
    expect(cell(rows[0], 'codePostalLieuSurvenue')).toBe('75013');
    expect(cell(rows[0], 'typeMisEnCause')).toBe('Établissement');
    expect(cell(rows[0], 'precisionTypeMisEnCause')).toBe('Service hospitalier');
    expect(cell(rows[0], 'finessMisEnCause')).toBe('750000002');
    expect(cell(rows[0], 'categorieFinessMisEnCause')).toBe('');
    expect(cell(rows[0], 'nomService')).toBe('Urgences');
    expect(cell(rows[0], 'rppsMisEnCause')).toBe('');
    expect(cell(rows[0], 'nomMisEnCause')).toBe('');
    expect(cell(rows[0], 'codePostalMisEnCause')).toBe('75014');
    expect(cell(rows[0], 'categorieProfessionnelleRppsMisEnCause')).toBe('');
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

  it('places department columns immediately after their postal-code columns', () => {
    expect(columnAfter('codePostalDeclarant')).toEqual({
      key: 'departementDeclarant',
      header: 'Département déclarant',
    });
    expect(columnAfter('codePostalPersonneConcernee')).toEqual({
      key: 'departementPersonneConcernee',
      header: 'Département personne concernée',
    });
    expect(columnAfter('codePostalLieuSurvenue')).toEqual({
      key: 'departementLieuSurvenue',
      header: 'Département lieu de survenue',
    });
    expect(columnAfter('codePostalMisEnCause')).toEqual({
      key: 'departementMisEnCause',
      header: 'Département mis en cause',
    });
  });

  it('exports the root-scoped request status as the first column', () => {
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

    expect(EXPORT_REQUETES_COLUMNS[0]).toEqual({
      key: 'statutRequeteEntiteAdministrative',
      header: 'Statut de la requête pour mon entité administrative',
    });
    expect(rows[0][0]).toBe('Clôturée');
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
