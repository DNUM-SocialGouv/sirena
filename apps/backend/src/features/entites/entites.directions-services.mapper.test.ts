import { describe, expect, it } from 'vitest';
import { buildDirectionsServicesRows } from './entites.directions-services.mapper.js';

const entite = (overrides: Record<string, unknown> = {}) => ({
  id: 'id',
  nomComplet: 'Entity',
  label: 'ENT',
  email: '',
  entiteTypeId: 'ARS',
  entiteMereId: null,
  isActive: true,
  ...overrides,
});

describe('buildDirectionsServicesRows', () => {
  it('builds local direction and service rows without returning the root entite or global-only columns', () => {
    const rows = buildDirectionsServicesRows([
      entite({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
      }),
      entite({
        id: 'dir-autonomie',
        nomComplet: 'Direction Autonomie',
        label: 'DA',
        email: 'direction-autonomie@ars.fr',
        entiteMereId: 'root-ars',
      }),
      entite({
        id: 'service-pa',
        nomComplet: 'Service PA',
        label: 'PA',
        email: 'service-pa@ars.fr',
        entiteMereId: 'dir-autonomie',
      }),
    ]);

    expect(rows).toEqual([
      {
        id: 'dir-autonomie',
        directionNom: 'Direction Autonomie',
        directionLabel: 'DA',
        serviceNom: '',
        serviceLabel: '',
        email: 'direction-autonomie@ars.fr',
        editId: 'dir-autonomie',
      },
      {
        id: 'service-pa',
        directionNom: 'Direction Autonomie',
        directionLabel: 'DA',
        serviceNom: 'Service PA',
        serviceLabel: 'PA',
        email: 'service-pa@ars.fr',
        editId: 'service-pa',
      },
    ]);

    for (const row of rows) {
      expect(row).not.toHaveProperty('contactUsager');
      expect(row).not.toHaveProperty('isActiveLabel');
    }
  });
});
