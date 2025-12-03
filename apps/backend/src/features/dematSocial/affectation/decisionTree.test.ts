import type { LieuType, Motif } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { checkRequired, computeEntitesFromMotifs, filterMotifs, leaf, rootNode, runDecisionTree } from './decisionTree';
import type { DecisionLeaf, EntiteAdminType, SituationContext } from './types';

describe('leaf helper', () => {
  it('should build a DecisionLeaf with given parameters', () => {
    const node = leaf('id_test', 'Desc', ['ARS', 'CD'] as EntiteAdminType[]);

    expect(node).toEqual({
      kind: 'leaf',
      id: 'id_test',
      description: 'Desc',
      add: ['ARS', 'CD'],
    });
  });
});

describe('filterMotifs', () => {
  it('should keep only motifs that are valid MOTIF enum keys', () => {
    const ctx: SituationContext = {
      motifs: ['PROBLEME_QUALITE_SOINS', 'DIFFICULTES_ACCES_SOINS', 'UNKNOWN_MOTIF'],
    };

    const result = filterMotifs(ctx);

    expect(result).toContain('PROBLEME_QUALITE_SOINS');
    expect(result).toContain('DIFFICULTES_ACCES_SOINS');
    expect(result).not.toContain('UNKNOWN_MOTIF');
  });

  it('should return empty array when ctx.motifs is undefined', () => {
    const ctx: SituationContext = {};
    const result = filterMotifs(ctx);

    expect(result).toEqual([]);
  });
});

describe('checkRequired', () => {
  it('should not throw if required is not defined', () => {
    const node: DecisionLeaf = {
      kind: 'leaf',
      id: 'test',
      description: 'Test',
      add: [],
    };
    expect(() => checkRequired(node, { lieuType: 'DOMICILE' })).not.toThrow();
  });

  it('should not throw if required is empty', () => {
    const node: DecisionLeaf = {
      kind: 'leaf',
      id: 'test',
      description: 'Test',
      add: [],
      required: [],
    };

    expect(() => checkRequired(node, { lieuType: 'DOMICILE' })).not.toThrow();
  });

  it('should throw if required specific variable is not defined', () => {
    const node: DecisionLeaf = {
      kind: 'leaf',
      id: 'test',
      description: 'Test',
      add: [],
      required: ['lieuType'],
    };
    expect(() => checkRequired(node, { isMaltraitance: false })).toThrow(
      /Node test requires the following variables to be defined: lieuType/,
    );
  });
});

describe('computeEntitesFromMotifs', () => {
  it('should map ARS-related motifs to ARS and deduplicate', () => {
    const ctx = {
      motifs: ['PROBLEME_QUALITE_SOINS', 'UNKNOWN_MOTIF'] as Motif[],
      motifsDeclaratifs: ['DIFFICULTES_ACCES_SOINS'] as Motif[],
    };

    const result = computeEntitesFromMotifs(ctx);

    expect(result).toEqual(['ARS']);
  });

  it('should return empty array when no mapped motifs', () => {
    const ctx = {
      motifs: ['AUTRE_TRUC'] as unknown as Motif[],
      motifsDeclaratifs: ['UN_MOTIF_NON_MAPPE'] as unknown as Motif[],
    };

    const result = computeEntitesFromMotifs(ctx);
    expect(result).toEqual([]);
  });
});

describe('runDecisionTree - domicile', () => {
  it('should assign CD for domicile with non-professional mis en cause', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'MEMBRE_FAMILLE',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['CD']);
  });

  it('should assign ARS for domicile with professional health professional', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      professionDomicileType: 'PROF_LIBERAL',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign CD for domicile with SAAD', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      professionDomicileType: 'SAAD',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['CD']);
  });
});

describe('runDecisionTree - non domicile + maltraitance', () => {
  it('should assign CD + ARS when maltraitance by family in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'MEMBRE_FAMILLE',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS', 'CD']);
  });

  it('should assign ARS + DD for maltraitance by MJPM in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'AUTRE',
      misEnCauseTypePrecision: 'MJPM',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS', 'DD']);
  });
});

describe('runDecisionTree - non domicile sans maltraitance (lieu de survenue)', () => {
  it('should assign ARS for non domicile in health establishment without maltraitance', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: false,
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign ARS for non domicile during transport', async () => {
    const ctx: SituationContext = {
      lieuType: 'TRAJET',
      isMaltraitance: false,
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
  });
});

describe('runDecisionTree - motifs / FINESS branch', () => {
  it('should go through motifReclamationSubtree and use FINESS when at least one non-exempt motif', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_COMPORTEMENTAL', 'PROBLEME_QUALITE_SOINS'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should NOT go through FINESS when all motifs are exempt (only ARS via motifs)', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS', 'DIFFICULTES_ACCES_SOINS'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should return empty when no motifs and no other rules hit (ex: lieu non géré)', async () => {
    const ctx: SituationContext = {
      lieuType: 'AUTRE_LIEU_NON_GERE' as LieuType,
      isMaltraitance: false,
      motifsDeclaratifs: [],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual([]);
  });
});

describe('runDecisionTree - required fields / validation', () => {
  it('should throw if required root field (lieuType) is missing', async () => {
    const ctx = {};

    await expect(runDecisionTree(ctx)).rejects.toThrow(/lieuType/);
  });

  it('should throw if required misEnCauseType is missing in domicile subtree', async () => {
    const ctx = {
      lieuType: 'DOMICILE' as LieuType,
    };

    await expect(runDecisionTree(ctx)).rejects.toThrow(/misEnCauseType/);
  });

  it('should throw if required isMaltraitance is missing in non domicile subtree', async () => {
    const ctx = {
      lieuType: 'ETABLISSEMENT_SANTE' as LieuType,
    };

    await expect(runDecisionTree(ctx)).rejects.toThrow(/isMaltraitance/);
  });
});

describe('internal tree sanity (structure)', () => {
  it('rootNode should be a branch with both branches defined', () => {
    expect(rootNode.kind).toBe('branch');
    if (rootNode.kind === 'branch') {
      expect(rootNode.ifTrue).toBeTruthy();
      expect(rootNode.ifFalse).toBeTruthy();
    }
  });
});
