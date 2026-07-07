import { describe, expect, it } from 'vitest';

import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import { buildExportRequetesCsv, buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';

describe('buildExportRequetesCsv', () => {
  it('exports the stable 60-column business header when there are no rows', () => {
    const csv = buildExportRequetesCsv([]);
    const header = csv.replace(/^\uFEFF/, '');
    const columns = header.split(';');

    expect(csv).toMatch(/^\uFEFF/);
    expect(header).not.toContain('\n');
    expect(columns).toHaveLength(60);
    expect(headerCell(columns, 'statutRequeteEntiteAdministrative')).toBe(
      'Statut de la requête pour mon entité administrative',
    );
    expect(headerCell(columns, 'numeroRequete')).toBe('Numéro de requête');
    expect(headerCell(columns, 'departementDeclarant')).toBe('Département déclarant');
    expect(headerCell(columns, 'departementPersonneConcernee')).toBe('Département personne concernée');
    expect(headerCell(columns, 'numeroSituation')).toBe('Numéro de situation');
    expect(headerCell(columns, 'departementLieuSurvenue')).toBe('Département lieu de survenue');
    expect(headerCell(columns, 'departementMisEnCause')).toBe('Département mis en cause');
    expect(headerCell(columns, 'raisonsClotureEntiteAdministrative')).toBe(
      'Raison(s) clôture de la requête pour mon entité administrative',
    );
  });

  it('exports ARS CSV rows with status, departments and lieu name', () => {
    const csv = buildExportRequetesCsvFromRecords(
      [
        {
          id: 'REQ-2026-0015',
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
              entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
              statut: { label: 'Clôturée' },
            },
          ],
          situations: [
            {
              lieuDeSurvenue: {
                adresse: { codePostal: '69002', label: 'IFSI AP-HP DU CH AMBROISE PARÉ' },
              },
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

    expect(csvCell(row, 'statutRequeteEntiteAdministrative')).toBe('Clôturée');
    expect(csvCell(row, 'departementDeclarant')).toBe('75');
    expect(csvCell(row, 'departementPersonneConcernee')).toBe('971');
    expect(csvCell(row, 'nomLieuSurvenue')).toBe('IFSI AP-HP DU CH AMBROISE PARÉ');
    expect(csvCell(row, 'departementLieuSurvenue')).toBe('69');
    expect(csvCell(row, 'departementMisEnCause')).toBe('980');
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

    expect(row).toHaveLength(60);
    expect(csvCell(row, 'codePostalDeclarant')).toBe('75001');
    expect(csvCell(row, 'departementDeclarant')).toBe('');
    expect(csvCell(row, 'codePostalPersonneConcernee')).toBe('97110');
    expect(csvCell(row, 'departementPersonneConcernee')).toBe('');
    expect(csvCell(row, 'codePostalLieuSurvenue')).toBe('69002');
    expect(csvCell(row, 'departementLieuSurvenue')).toBe('');
    expect(csvCell(row, 'departementMisEnCause')).toBe('');
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
