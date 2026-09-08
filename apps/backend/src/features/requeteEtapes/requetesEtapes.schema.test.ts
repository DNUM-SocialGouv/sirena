import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { RequeteEtapeWithDetailsSchema } from './requetesEtapes.schema.js';

const sourceEntite = {
  id: 'source-entite',
  nomComplet: 'ARS Normandie',
  entiteTypeId: 'ARS',
};

const targetEntite = {
  id: 'target-entite',
  nomComplet: 'Conseil départemental de Seine-Maritime',
  entiteTypeId: 'CD',
};

const assignmentResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  nom: 'Affectation',
  type: REQUETE_ETAPE_TYPES.ASSIGNMENT,
  estPartagee: true,
  acknowledgmentSendMode: null,
  acknowledgmentSendOperationId: null,
  statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
  dateRealisation: new Date('2026-08-27T10:00:00.000Z'),
  rappelType: null,
  rappelDate: null,
  requeteId: 'requete-id',
  entiteId: sourceEntite.id,
  assignedEntiteId: 'target-entite',
  clotureEffectiveDate: null,
  createdAt: new Date('2026-08-27T10:00:00.000Z'),
  updatedAt: new Date('2026-08-27T10:00:00.000Z'),
  entiteAdministrative: sourceEntite,
  assignedEntite: null,
  editable: false,
  canOnlyEditNotes: false,
  uploadedFiles: [],
  notes: [],
  timelineItemType: 'ENTITY_STEP',
  attributedEntiteAdministrative: sourceEntite,
};

describe('RequeteEtapeWithDetailsSchema', () => {
  it('rejects an assignment response without its target administrative entity', () => {
    expect(RequeteEtapeWithDetailsSchema.safeParse(assignmentResponse).success).toBe(false);
  });

  it('accepts an assignment response with its structured target', () => {
    const result = RequeteEtapeWithDetailsSchema.safeParse({
      ...assignmentResponse,
      assignedEntite: targetEntite,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an assignment target on another processing step type', () => {
    const result = RequeteEtapeWithDetailsSchema.safeParse({
      ...assignmentResponse,
      type: REQUETE_ETAPE_TYPES.MANUAL,
      assignedEntite: targetEntite,
    });

    expect(result.success).toBe(false);
  });
});
