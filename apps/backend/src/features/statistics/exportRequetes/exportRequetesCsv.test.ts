import { describe, expect, it } from 'vitest';

import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import { buildExportRequetesCsv, buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';

describe('buildExportRequetesCsv', () => {
  it('exports the stable 55-column business header when there are no rows', () => {
    const csv = buildExportRequetesCsv([]);
    const header = csv.replace(/^\uFEFF/, '');
    const columns = header.split(';');

    expect(csv).toMatch(/^\uFEFF/);
    expect(header).not.toContain('\n');
    expect(columns).toHaveLength(55);
    expect(columns[0]).toBe('Numéro de requête');
    expect(headerCell(columns, 'statutRequeteEntiteAdministrative')).toBe(
      'Statut de la requête pour mon entité administrative',
    );
    expect(headerCell(columns, 'numeroRequete')).toBe('Numéro de requête');
    expect(headerCell(columns, 'dateDepotPlainte')).toBe('Date de dépôt de plainte');
    expect(headerCell(columns, 'villeDeclarant')).toBe('Ville déclarant');
    expect(headerCell(columns, 'departementDeclarant')).toBe('Département déclarant');
    expect(headerCell(columns, 'villePersonneConcernee')).toBe('Ville personne concernée');
    expect(headerCell(columns, 'departementPersonneConcernee')).toBe('Département personne concernée');
    expect(columns).not.toContain('RPPS mis en cause');
    expect(columns).not.toContain('Nom mis en cause');
    expect(columns).not.toContain('Code postal mis en cause');
    expect(columns).not.toContain('Catégorie professionnelle du RPPS mis en cause');
    expect(columns).toContain('Département mis en cause');
    expect(headerCell(columns, 'numeroSituation')).toBe('Numéro de situation');
    expect(headerCell(columns, 'villeLieuSurvenue')).toBe('Ville lieu de survenue');
    expect(headerCell(columns, 'departementLieuSurvenue')).toBe('Département lieu de survenue');
    expect(headerCell(columns, 'departementMisEnCause')).toBe('Département mis en cause');
    expect(headerCell(columns, 'raisonsClotureEntiteAdministrative')).toBe(
      'Raison(s) clôture de la requête pour mon entité administrative',
    );
  });

  it('exports non-ARS CSV rows with department columns present but empty', () => {
    const csv = buildExportRequetesCsvFromRecords(
      [
        {
          id: 'REQ-2026-0016',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '75001' },
            veutGarderAnonymat: false,
            estSignalementProfessionnel: false,
          },
          participant: {
            adresse: { codePostal: '97110' },
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
              lieuDeSurvenue: { codePostal: '69002' },
              misEnCause: { codePostal: '98000' },
            },
          ],
        },
      ],
      { topEntiteId: 'root-entite' },
    );
    const row = csv
      .replace(/^\uFEFF/, '')
      .split('\n')[1]
      .split(';');

    expect(row).toHaveLength(55);
    expect(csvCell(row, 'codePostalDeclarant')).toBe('75001');
    expect(csvCell(row, 'villeDeclarant')).toBe('');
    expect(csvCell(row, 'departementDeclarant')).toBe('');
    expect(csvCell(row, 'codePostalPersonneConcernee')).toBe('97110');
    expect(csvCell(row, 'villePersonneConcernee')).toBe('');
    expect(csvCell(row, 'departementPersonneConcernee')).toBe('');
    expect(csvCell(row, 'codePostalLieuSurvenue')).toBe('69002');
    expect(csvCell(row, 'villeLieuSurvenue')).toBe('');
    expect(csvCell(row, 'departementLieuSurvenue')).toBe('');
    expect(csvCell(row, 'departementMisEnCause')).toBe('');
  });

  it('exports the corrected feedback contract as observable CSV output', () => {
    const csv = buildExportRequetesCsvFromRecords(
      [
        {
          id: 'REQ-2026-0642',
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
          declarant: {
            estVictime: false,
            isTuteur: false,
            adresse: { codePostal: '75001' },
            veutGarderAnonymat: false,
            estSignalementProfessionnel: false,
          },
          participant: {
            adresse: { codePostal: '97110' },
            veutGarderAnonymat: false,
            estVictimeInformee: true,
            estHandicapee: false,
            aAutrePersonnes: true,
            autrePersonnes: 'Free text must not be exported',
          },
          requeteEntites: [
            {
              entiteId: 'root-entite',
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'Clôturée' },
            },
          ],
          situations: [
            {
              lieuDeSurvenue: {
                lieuTypeId: 'ETABLISSEMENT_SANTE',
                adresse: { codePostal: '69002' },
              },
              misEnCause: { codePostal: '98000' },
              demarchesEngagees: {
                dateContactEtablissement: new Date('2026-06-11T00:00:00.000Z'),
                etablissementARepondu: true,
                datePlainte: new Date('2026-06-12T00:00:00.000Z'),
                autoriteType: { label: 'Gendarmerie' },
                demarches: [{ label: "Démarches engagées auprès d'autres organismes" }],
              },
              faits: [
                {
                  motifsDeclaratifs: [],
                  motifs: [
                    { motifId: 'QUALITE_SOINS/DELAIS_PRISE_EN_CHARGE', motif: { label: 'Délais de prise en charge' } },
                  ],
                  consequences: [],
                },
              ],
            },
          ],
        },
      ],
      { topEntiteId: 'root-entite' },
    );
    const [headerLine, rowLine] = csv.replace(/^\uFEFF/, '').split('\n');
    const header = headerLine.split(';');
    const row = rowLine.split(';');

    expect(header).not.toContain('RPPS mis en cause');
    expect(header).not.toContain('Nom mis en cause');
    expect(header).not.toContain('Code postal mis en cause');
    expect(header).not.toContain('Catégorie professionnelle du RPPS mis en cause');
    expect(headerCell(header, 'departementMisEnCause')).toBe('Département mis en cause');
    expect(csvCell(row, 'statutRequeteEntiteAdministrative')).toBe('Clôturée');
    expect(csvCell(row, 'departementDeclarant')).toBe('75');
    expect(csvCell(row, 'departementPersonneConcernee')).toBe('971');
    expect(csvCell(row, 'departementLieuSurvenue')).toBe('69');
    expect(csvCell(row, 'autrePersonneConcernee')).toBe('Oui');
    expect(csvCell(row, 'misEnCauseContacte')).toBe('Oui');
    expect(csvCell(row, 'datePriseContact')).toBe('11/06/2026');
    expect(csvCell(row, 'declarantRecuReponse')).toBe('Oui');
    expect(csvCell(row, 'plainteDeposee')).toBe('Oui');
    expect(csvCell(row, 'dateDepotPlainte')).toBe('12/06/2026');
    expect(csvCell(row, 'lieuDepotPlainte')).toBe('Gendarmerie');
    expect(csvCell(row, 'demarchesAutresOrganismes')).toBe('Oui');
    expect(csvCell(row, 'motifsQualifies')).toBe('Délais de prise en charge (Qualité des soins)');
    expect(csvCell(row, 'departementMisEnCause')).toBe('980');
  });

  it('exports requête records as CSV data rows below the header', () => {
    const csv = buildExportRequetesCsvFromRecords([
      {
        id: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{}],
      },
    ]);
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    const row = lines[1].split(';');

    expect(lines).toHaveLength(2);
    expect(row).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
    expect(csvCell(row, 'numeroRequete')).toBe('REQ-2026-0001');
    expect(csvCell(row, 'numeroSituation')).toBe('1');
    expect(csvCell(row, 'dateCreationRequeteSirena')).toBe('18/06/2026');
  });
});

function headerCell(row: string[], key: ExportRequetesColumnKey): string | undefined {
  return row[columnIndex(key)];
}

function csvCell(row: string[], key: ExportRequetesColumnKey): string | undefined {
  return row[columnIndex(key)];
}

function columnIndex(key: ExportRequetesColumnKey): number {
  return EXPORT_REQUETES_COLUMNS.findIndex((column) => column.key === key);
}
