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
    expect(rows[0]).toHaveLength(59);
    expect(rows[0][0]).toBe('REQ-2026-0001');
    expect(rows[0][16]).toBe(1);
    expect(rows[0][50]).toBe('18/06/2026');
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
          lienVictime: { label: 'Parent' },
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
          mesureProtection: 'MANDATAIRE_JUDICIAIRE',
          estHandicapee: true,
          aAutrePersonnes: true,
          autrePersonnes: 'Sa sœur',
        },
        situations: [{}],
      },
    ]);

    expect(rows[0][1]).toBe('Non');
    expect(rows[0][2]).toBe('Parent');
    expect(rows[0][3]).toBe('Oui');
    expect(rows[0][4]).toBe('75001');
    expect(rows[0][5]).toBe('Oui');
    expect(rows[0][6]).toBe('Oui');
    expect(rows[0][7]).toBe('Madame');
    expect(rows[0][8]).toBe('');
    expect(rows[0][9]).toBe('1980');
    expect(rows[0][10]).toBe('69002');
    expect(rows[0][11]).toBe('Non');
    expect(rows[0][12]).toBe('Non');
    expect(rows[0][13]).toBe('mandataire judiciaire');
    expect(rows[0][14]).toBe('Oui');
    expect(rows[0][15]).toBe('Sa sœur');
    expect(rows[0][51]).toBe('17/06/2026');
    expect(rows[0][52]).toBe('Téléphone');
    expect(rows[0][53]).toBe('16/06/2026');
    expect(rows[0][54]).toBe('Demat.social');
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
    expect(rows[0][0]).toBe('REQ-2026-0002');
    expect(rows[0][16]).toBe(1);
    expect(rows[0][50]).toBe('18/06/2026');
    expect(rows[1][0]).toBe('REQ-2026-0002');
    expect(rows[1][16]).toBe(2);
    expect(rows[1][50]).toBe('18/06/2026');
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
    expect(rows[0]).toHaveLength(59);
    expect(rows[0][0]).toBe('REQ-2026-0003');
    expect(rows[0][16]).toBe('');
    expect(rows[0][50]).toBe('18/06/2026');
  });
});

function cell(row: ExportRequetesCsvRow, key: ExportRequetesColumnKey): ExportRequetesCsvRow[number] {
  const index = EXPORT_REQUETES_COLUMNS.findIndex((column) => column.key === key);

  return row[index];
}
