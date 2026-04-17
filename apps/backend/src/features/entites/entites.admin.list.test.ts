import { describe, expect, it } from 'vitest';
import { buildEntitesListAdmin } from './entites.admin.list.js';

const entite = (overrides: Record<string, unknown> = {}) => ({
  id: 'id',
  nomComplet: 'Entity',
  label: 'ENT',
  email: '',
  emailContactUsager: '',
  telContactUsager: '',
  adresseContactUsager: '',
  emailDomain: '',
  organizationalUnit: '',
  entiteTypeId: 'ARS',
  entiteMereId: null,
  departementCode: null,
  ctcdCode: null,
  regionCode: null,
  regLib: null,
  dptLib: null,
  isActive: true,
  ...overrides,
});

describe('buildEntitesListAdmin', () => {
  it('orders entite roots by family, then descendants, and builds table-ready rows', () => {
    const rows = buildEntitesListAdmin([
      entite({
        id: 'svc-1',
        nomComplet: 'Service Z',
        label: 'SZ',
        entiteTypeId: 'ARS',
        entiteMereId: 'dir-1',
        email: 'service@ars.fr',
        isActive: false,
      }),
      entite({
        id: 'root-dd',
        nomComplet: 'DD Loire',
        label: 'DD 42',
        entiteTypeId: 'DD',
      }),
      entite({
        id: 'root-cd',
        nomComplet: 'CD Calvados',
        label: 'CD 14',
        entiteTypeId: 'CD',
      }),
      entite({
        id: 'dir-1',
        nomComplet: 'Direction A',
        label: 'DIR A',
        entiteTypeId: 'ARS',
        entiteMereId: 'root-ars',
      }),
      entite({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        entiteTypeId: 'ARS',
        emailContactUsager: 'contact@ars.fr',
        telContactUsager: '01 02 03 04 05',
      }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['root-ars', 'dir-1', 'svc-1', 'root-cd', 'root-dd']);

    expect(rows[0]).toMatchObject({
      id: 'root-ars',
      entiteNom: 'ARS Normandie',
      entiteLabel: 'ARS NOR',
      directionNom: '',
      directionLabel: '',
      serviceNom: '',
      serviceLabel: '',
      email: '',
      contactUsager: 'contact@ars.fr · 01 02 03 04 05',
      isActiveLabel: 'Oui',
      editId: 'root-ars',
    });

    expect(rows[1]).toMatchObject({
      id: 'dir-1',
      entiteNom: 'ARS Normandie',
      entiteLabel: 'ARS NOR',
      directionNom: 'Direction A',
      directionLabel: 'DIR A',
      serviceNom: '',
      serviceLabel: '',
      email: '',
      contactUsager: '',
      isActiveLabel: 'Oui',
      editId: 'dir-1',
    });

    expect(rows[2]).toMatchObject({
      id: 'svc-1',
      entiteNom: 'ARS Normandie',
      entiteLabel: 'ARS NOR',
      directionNom: 'Direction A',
      directionLabel: 'DIR A',
      serviceNom: 'Service Z',
      serviceLabel: 'SZ',
      email: 'service@ars.fr',
      contactUsager: '',
      isActiveLabel: 'Non',
      editId: 'svc-1',
    });
  });

  it('orders siblings alphabetically under the same parent', () => {
    const rows = buildEntitesListAdmin([
      entite({
        id: 'dir-b',
        nomComplet: 'Direction B',
        label: 'DIR B',
        entiteTypeId: 'ARS',
        entiteMereId: 'root-ars',
      }),
      entite({
        id: 'dir-a',
        nomComplet: 'Direction A',
        label: 'DIR A',
        entiteTypeId: 'ARS',
        entiteMereId: 'root-ars',
      }),
      entite({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        entiteTypeId: 'ARS',
      }),
      entite({
        id: 'dir-c',
        nomComplet: 'Direction C',
        label: 'DIR C',
        entiteTypeId: 'ARS',
        entiteMereId: 'root-ars',
      }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['root-ars', 'dir-a', 'dir-b', 'dir-c']);
  });

  it('builds contact usager with only non-empty values', () => {
    const rows = buildEntitesListAdmin([
      entite({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        entiteTypeId: 'ARS',
        emailContactUsager: 'contact@ars.fr',
        telContactUsager: '',
        adresseContactUsager: '12 rue de la Paix',
      }),
    ]);

    expect(rows[0]).toMatchObject({
      id: 'root-ars',
      contactUsager: 'contact@ars.fr · 12 rue de la Paix',
    });
  });

  it('orders unknown root types after known root families', () => {
    const rows = buildEntitesListAdmin([
      entite({
        id: 'root-unknown',
        nomComplet: 'ZZ Custom',
        label: 'ZZ',
        entiteTypeId: 'ZZ',
      }),
      entite({
        id: 'root-cd',
        nomComplet: 'CD Calvados',
        label: 'CD 14',
        entiteTypeId: 'CD',
      }),
      entite({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        entiteTypeId: 'ARS',
      }),
      entite({
        id: 'root-dd',
        nomComplet: 'DD Loire',
        label: 'DD 42',
        entiteTypeId: 'DD',
      }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['root-ars', 'root-cd', 'root-dd', 'root-unknown']);
  });
});
