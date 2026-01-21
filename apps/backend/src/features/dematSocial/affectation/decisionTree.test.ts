import type { LieuType, Motif } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { checkRequired, computeEntitesFromMotifs, leaf, rootNode, runDecisionTree } from './decisionTree.js';
import type { DecisionLeaf, DecisionNode, EntiteAdminType, SituationContext } from './types.js';

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
  it('should map ARS-related motifs déclaratifs to ARS', () => {
    const ctx = {
      motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS'] as Motif[],
    };

    const result = computeEntitesFromMotifs(ctx);

    expect(result).toEqual(['ARS']);
  });

  it('should return empty array when no mapped motifs déclaratifs', () => {
    const ctx = {
      motifsDeclaratifs: ['UN_MOTIF_NON_MAPPE'] as unknown as Motif[],
    };

    const result = computeEntitesFromMotifs(ctx);
    expect(result).toEqual([]);
  });

  it('should return empty array when motifsDeclaratifs is undefined', () => {
    const ctx: SituationContext = {};

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

  it('should assign ARS for domicile with PROFESSIONNEL_SANTE and ProfessionSantePrecision', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: 'INFIRMIER',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign ARS for domicile with PROFESSIONNEL_SANTE without precision (default)', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: null,
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign CD for domicile with PROFESSIONNEL_SANTE and ProfessionDomicileType (service aide domicile)', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: 'SAAD',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['CD']);
  });

  it('should assign ARS for domicile with PROFESSIONNEL_SANTE and SESSAD precision', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: 'SESSAD',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign DD for domicile with NPJM mis en cause', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SOCIAL',
      misEnCauseTypePrecision: 'MJPM',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['DD']);
  });

  it('should assign DD for domicile with PROFESSIONNEL_SANTE and MJPM precision', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: 'MJPM',
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['DD']);
  });

  it('should assign CD for domicile with PROFESSIONNEL_SOCIAL', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SOCIAL',
      misEnCauseTypePrecision: null,
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['CD']);
  });

  it('should assign CD for domicile with AUTRE_PROFESSIONNEL', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'AUTRE_PROFESSIONNEL',
      misEnCauseTypePrecision: null,
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

  it('should assign CD + ARS when maltraitance by "proche" in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'PROCHE',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS', 'CD']);
  });

  it('should assign ARS + ARS (deduplicated to ARS) when maltraitance by health professional in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'PROFESSIONNEL_SANTE',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign DD + ARS when maltraitance by NPJM in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'PROFESSIONNEL_SOCIAL',
      misEnCauseTypePrecision: 'MJPM',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS', 'DD']);
  });

  it('should assign DD + ARS when maltraitance by MJPM (via precision) in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: 'MJPM',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS', 'DD']);
  });

  it('should assign only ARS when maltraitance by establishment in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'ETABLISSEMENT',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign only ARS when maltraitance by other professional (PROFESSIONNEL_SOCIAL) in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'PROFESSIONNEL_SOCIAL',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign only ARS when maltraitance by other professional (AUTRE_PROFESSIONNEL) in health establishment', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_SANTE',
      isMaltraitance: true,
      misEnCauseType: 'AUTRE_PROFESSIONNEL',
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
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
  it('should assign ARS when single motif is PROBLEME_QUALITE_SOINS', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should go through FINESS when single motif is not PROBLEME_QUALITE_SOINS', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_COMPORTEMENTAL'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual([]);
  });

  it('should assign ARS when all motifs are PROBLEME_QUALITE_SOINS', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS', 'PROBLEME_QUALITE_SOINS'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should assign ARS when at least one motif is PROBLEME_QUALITE_SOINS (others go through FINESS)', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_COMPORTEMENTAL', 'PROBLEME_QUALITE_SOINS'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual(['ARS']);
  });

  it('should go through FINESS for all motifs when none is PROBLEME_QUALITE_SOINS', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_COMPORTEMENTAL', 'PROBLEME_FACTURATION'],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual([]);
  });

  it('should handle empty motifsDeclaratifs array', async () => {
    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: [],
    };

    const result = await runDecisionTree(ctx);

    expect(result.sort()).toEqual([]);
  });

  it('should evaluate FINESS node X times for X non-PROBLEME_QUALITE_SOINS motifs', async () => {
    let finessNodeCallCount = 0;

    const modifyFinessNode = (node: DecisionNode): void => {
      if (node.kind === 'leaf' && node.id === 'finess_referentiel') {
        const originalAdd = node.add;
        node.add = (ctx: SituationContext) => {
          finessNodeCallCount += 1;
          if (typeof originalAdd === 'function') {
            return originalAdd(ctx);
          }
          return originalAdd;
        };
        return;
      }
      if (node.kind === 'branch') {
        if (node.ifTrue) modifyFinessNode(node.ifTrue);
        if (node.ifFalse) modifyFinessNode(node.ifFalse);
      }
      if (node.kind === 'switch') {
        Object.values(node.cases).forEach((caseNode) => {
          modifyFinessNode(caseNode);
        });
        if (node.default) modifyFinessNode(node.default);
      }
      if (node.kind === 'forEach') {
        modifyFinessNode(node.forEach);
        if (node.after) modifyFinessNode(node.after);
      }
      if (node.kind === 'leaf' && node.next) {
        modifyFinessNode(node.next);
      }
    };

    modifyFinessNode(rootNode);

    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: ['PROBLEME_COMPORTEMENTAL', 'PROBLEME_FACTURATION', 'PROBLEME_LOCAUX'],
    };

    await runDecisionTree(ctx);

    expect(finessNodeCallCount).toBe(3);
  });

  it('should evaluate FINESS node only for non-PROBLEME_QUALITE_SOINS motifs', async () => {
    let finessNodeCallCount = 0;

    const modifyFinessNode = (node: DecisionNode): void => {
      if (node.kind === 'leaf' && node.id === 'finess_referentiel') {
        const originalAdd = node.add;
        node.add = (ctx: SituationContext) => {
          finessNodeCallCount += 1;
          if (typeof originalAdd === 'function') {
            return originalAdd(ctx);
          }
          return originalAdd;
        };
        return;
      }
      if (node.kind === 'branch') {
        if (node.ifTrue) modifyFinessNode(node.ifTrue);
        if (node.ifFalse) modifyFinessNode(node.ifFalse);
      }
      if (node.kind === 'switch') {
        Object.values(node.cases).forEach((caseNode) => {
          modifyFinessNode(caseNode);
        });
        if (node.default) modifyFinessNode(node.default);
      }
      if (node.kind === 'forEach') {
        modifyFinessNode(node.forEach);
        if (node.after) modifyFinessNode(node.after);
      }
      if (node.kind === 'leaf' && node.next) {
        modifyFinessNode(node.next);
      }
    };

    modifyFinessNode(rootNode);

    const ctx: SituationContext = {
      lieuType: 'ETABLISSEMENT_PERSONNES_AGEES',
      isMaltraitance: false,
      motifsDeclaratifs: [
        'PROBLEME_QUALITE_SOINS',
        'PROBLEME_COMPORTEMENTAL',
        'PROBLEME_QUALITE_SOINS',
        'PROBLEME_FACTURATION',
      ],
    };

    await runDecisionTree(ctx);

    expect(finessNodeCallCount).toBe(2);
  });

  it('should throw error when lieu type is not supported (ex: lieu non géré)', async () => {
    const ctx: SituationContext = {
      lieuType: 'AUTRE_LIEU_NON_GERE' as LieuType,
      isMaltraitance: false,
      motifsDeclaratifs: [],
    };

    await expect(runDecisionTree(ctx)).rejects.toThrow(
      'Node non_domicile_lieu_de_survenue: Unsupported value "AUTRE_LIEU_NON_GERE" for required field "lieuType". Supported values: ETABLISSEMENT_SANTE, ETABLISSEMENT_PERSONNES_AGEES, ETABLISSEMENT_HANDICAP, ETABLISSEMENT_SOCIAL, TRAJET, AUTRES_ETABLISSEMENTS',
    );
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

  it('should handle missing misEnCauseTypePrecision in domicile professionnel subtree (defaults to PROFESSIONNEL_SANTE)', async () => {
    const ctx: SituationContext = {
      lieuType: 'DOMICILE',
      misEnCauseType: 'PROFESSIONNEL_SANTE',
      misEnCauseTypePrecision: null,
    };

    const result = await runDecisionTree(ctx);
    expect(result.sort()).toEqual(['ARS']);
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
