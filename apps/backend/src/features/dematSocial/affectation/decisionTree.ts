import {
  type MisEnCauseType,
  type MisEnCauseTypePrecisionUnion,
  MOTIF,
  type Motif,
  type ProfessionDomicileType,
  type ProfessionType,
} from '@sirena/common/constants';
import type { DecisionLeaf, DecisionNode, EntiteAdminType, SituationContext } from './types';

/*********************
 *  UTILITIES
 *********************/

export function leaf(id: string, description: string, add: EntiteAdminType[]): DecisionLeaf {
  return { kind: 'leaf', id, description, add };
}

export function checkRequired(node: DecisionNode, ctx: SituationContext) {
  if (!node.required || node.required.length === 0) return;

  const missing = node.required.filter((key) => ctx[key] === null || ctx[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Node ${node.id} requires the following variables to be defined: ${missing.join(', ')}`);
  }
}

function isMotif(value: Motif | string): value is Motif {
  return MOTIFS_SET.has(value as Motif);
}

export function filterMotifs(ctx: SituationContext): Motif[] {
  // keep only motifs (sirena motifs not motifsDeclaratifs) that are in the MOTIF enum to map decision tree schema
  return Array.isArray(ctx?.motifs) ? ctx.motifs.filter(isMotif) : [];
}

export function computeEntitesFromMotifs(ctx: SituationContext): EntiteAdminType[] {
  const acc = new Set<EntiteAdminType>();

  const allMotifs = [...filterMotifs(ctx), ...(ctx.motifsDeclaratifs ?? [])];

  for (const motif of allMotifs) {
    const entites = MOTIF_DECLARATIFS_TO_ENTITES[motif];
    if (entites) {
      for (const e of entites) acc.add(e);
    }
  }
  return Array.from(acc);
}

/*********************
 *  CONSTANTS
 *********************/

const DOMICILE_PRO_SANTE_MAPPING: Record<ProfessionDomicileType | ProfessionType, EntiteAdminType[]> = {
  TRAVAILLEUR_SOCIAL: ['CD'],
  PROF_SANTE: ['ARS'],
  PROF_SOIN: ['ARS'],
  INTERVENANT_DOMICILE: ['CD'],
  SERVICE_EDUCATION: ['ARS'],
  SERVICE_AIDE_FAMILLE: ['CD'],
  TUTEUR: ['DD'],
  AUTRE: ['CD'],
};

const MOTIFS_KEYS: Motif[] = Object.keys(MOTIF) as Motif[];
const MOTIFS_SET = new Set(MOTIFS_KEYS);
const MOTIF_DECLARATIFS_TO_ENTITES: Partial<Record<Motif, EntiteAdminType[]>> = {
  PROBLEME_QUALITE_SOINS: ['ARS'],
  DIFFICULTES_ACCES_SOINS: ['ARS'],
};

/*********************
 *  NODES DEFINITIONS
 *********************/

// 0 - ROOT NODE
export const rootNode: DecisionNode = {
  kind: 'branch',
  id: 'root_lieu_domicile_vs_hors_domicile',
  description: 'Lieu de survenue : domicile ou hors domicile ?',
  predicate: (ctx) => ctx.lieuType === 'DOMICILE',
  ifTrue: domicileSubtree(),
  ifFalse: nonDomicileSubtree(),
  required: ['lieuType'],
};

// 1 - DOMICILE SUBTREE
function domicileSubtree(): DecisionNode {
  return {
    kind: 'branch',
    id: 'domicile_mis_en_cause_professionnel_vs_autre',
    description: 'Mis en cause : professionnel ou non ?',
    predicate: (ctx) => {
      const isProfessionnel = !(['MEMBRE_FAMILLE', 'PROCHE', 'AUTRE'] as MisEnCauseType[]).includes(
        ctx.misEnCauseType as MisEnCauseType,
      );
      return isProfessionnel;
    },
    ifTrue: domicileProfessionnelSubtree(),
    ifFalse: {
      kind: 'leaf',
      id: 'domicile_mis_en_cause_non_pro_sante',
      description: 'Mis en cause : non professionnel',
      add: ['CD'],
    },
    required: ['misEnCauseType'],
  };
}

function domicileProfessionnelSubtree(): DecisionNode {
  return {
    kind: 'switch',
    id: 'domicile_professionnel_type',
    description: 'Type de service / intervention à domicile',
    required: ['professionDomicileType'],
    select: (ctx) => ctx.professionDomicileType ?? null,
    cases: Object.fromEntries(
      Object.entries(DOMICILE_PRO_SANTE_MAPPING).map(([key, entites]) => [
        key,
        leaf(`domicile_pro_${key.toLowerCase()}`, `Domicile - professionnel (${key})`, entites),
      ]),
    ),
  };
}

// 2 - NON DOMICILE SUBTREE
function nonDomicileSubtree(): DecisionNode {
  return {
    kind: 'branch',
    id: 'non_domicile_maltraitance',
    description: 'Est-ce une maltraitance ?',
    predicate: (ctx) => ctx.isMaltraitance === true,
    ifTrue: nonDomicileMaltraitanceSubtree(),
    ifFalse: nonDomicileLieuDeSurvenue(),
    required: ['isMaltraitance'],
  };
}

// 3 - NON DOMICILE MALTTRAITANCE SUBTREE
function nonDomicileMaltraitanceSubtree(): DecisionNode {
  return {
    kind: 'switch',
    id: 'maltraitance_mis_en_cause',
    description: 'Mis en cause : famille, proche, professionnel, autre',
    select: (ctx): MisEnCauseType | Extract<MisEnCauseTypePrecisionUnion, 'TUTEUR'> | null => {
      if (ctx.misEnCauseTypePrecision === 'TUTEUR') return 'TUTEUR';

      return ctx.misEnCauseType ?? null;
    },
    required: ['misEnCauseType'],
    cases: {
      MEMBRE_FAMILLE: {
        kind: 'leaf',
        id: 'maltraitance_membre_famille_add_cd',
        description: 'Maltraitance par un membre de la famille',
        add: ['CD'],
        next: nonDomicileLieuDeSurvenue(),
      },
      PROCHE: {
        kind: 'leaf',
        id: 'maltraitance_proche_add_cd',
        description: 'Maltraitance par un proche',
        add: ['CD'],
        next: nonDomicileLieuDeSurvenue(),
      },
      PROFESSIONNEL_SANTE: {
        kind: 'leaf',
        id: 'maltraitance_professionnel_sante_add_ars',
        description: 'Maltraitance par un professionnel de santé',
        add: ['ARS'],
        next: nonDomicileLieuDeSurvenue(),
      },
      TUTEUR: {
        kind: 'leaf',
        id: 'maltraitance_mjpm_tuteur_add_dd',
        description: 'Maltraitance par un MJPM',
        add: ['DD'],
        next: nonDomicileLieuDeSurvenue(),
      },
    },
    default: nonDomicileLieuDeSurvenue(),
  };
}

// 4 - NON DOMICILE LIEU DE SURVENUE SUBTREE
function nonDomicileLieuDeSurvenue(): DecisionNode {
  return {
    kind: 'switch',
    id: 'non_domicile_lieu_de_survenue',
    description: 'Lieu de survenue hors domicile',
    select: (ctx) => ctx.lieuType ?? null,
    required: ['lieuType'],
    cases: {
      ETABLISSEMENT_SANTE: {
        kind: 'leaf',
        id: 'lieu_etablissement_sante_ars',
        description: 'Lieu : établissement de santé (hôpital, clinique, laboratoire, pharmacie…)',
        add: ['ARS'],
      },
      CABINET: {
        kind: 'leaf',
        id: 'lieu_cabinet_ars',
        description: 'Lieu : cabinet médical',
        add: ['ARS'],
      },
      ETABLISSEMENT_PERSONNES_AGEES: motifReclamationSubtree(),
      ETABLISSEMENT_HANDICAP: motifReclamationSubtree(),
      ETABLISSEMENT_SOCIAL: motifReclamationSubtree(),
      TRAJET: {
        kind: 'leaf',
        id: 'lieu_trajet_ars',
        description: 'Lieu : durant le trajet (transport sanitaire, SAMU, pompier)',
        add: ['ARS'],
      },
      AUTRES_ETABLISSEMENTS: {
        kind: 'leaf',
        id: 'lieu_autres_etablissements_ars',
        description: 'Lieu : autres établissements (institut d’esthétique, salon de tatouage, prison…)',
        add: ['ARS'],
      },
    },
  };
}

// 5 - MOTIF RÉCLAMATION SUBTREE
function motifReclamationSubtree(): DecisionNode {
  return {
    kind: 'branch',
    id: 'motifs_reclamation_multi',
    description: 'Traitement multi-motifs de la réclamation',
    predicate: (ctx: SituationContext) => {
      const finessExempt: Motif[] = ['PROBLEME_QUALITE_SOINS', 'DIFFICULTES_ACCES_SOINS'];

      // merge motifs and declarative motifs
      const all = [...filterMotifs(ctx), ...(ctx.motifsDeclaratifs ?? [])];

      // If only one motif is not exempt → FINESS required
      return all.some((m) => !finessExempt.includes(m));
    },
    // add entities (both cases)
    addIfTrue: computeEntitesFromMotifs,
    addIfFalse: computeEntitesFromMotifs,
    // if at least one motif requires FINESS
    ifTrue: finessReferentielPlaceholderSubtree(),
    // otherwise → end of motif treatment
    ifFalse: leaf('motif_reclamation_no_finess', 'Aucun motif nécessitant FINESS', []),
  };
}

// 6 - Referentiel FINESS
// TODO: implémenter le référentiel via FINESS
function finessReferentielPlaceholderSubtree(): DecisionNode {
  return {
    kind: 'leaf',
    id: 'finess_referentiel',
    description: 'À implémenter : référentiel via FINESS',
    add: [],
  };
}

/*********************
 *  RUN DECISION TREE
 *********************/
async function evalNode(
  node: DecisionNode,
  ctx: SituationContext,
  found: Set<EntiteAdminType>,
  depth: number = 0,
): Promise<void> {
  const MAX_DEPTH = 1000;

  if (depth > MAX_DEPTH) {
    throw new Error(`Affectation: Decision tree depth exceeded: ${depth}`);
  }

  checkRequired(node, ctx);

  switch (node.kind) {
    case 'leaf': {
      const added = typeof node.add === 'function' ? node.add(ctx) : node.add;
      for (const t of added) found.add(t);

      if (node.next) {
        await evalNode(node.next, ctx, found);
      }
      return;
    }
    case 'branch': {
      const ok = node.predicate(ctx);

      if (ok) {
        if (node.addIfTrue) {
          const added = typeof node.addIfTrue === 'function' ? node.addIfTrue(ctx) : node.addIfTrue;
          for (const t of added) found.add(t);
        }
        await evalNode(node.ifTrue, ctx, found);
      } else {
        if (node.addIfFalse) {
          const added = typeof node.addIfFalse === 'function' ? node.addIfFalse(ctx) : node.addIfFalse;
          for (const t of added) found.add(t);
        }
        await evalNode(node.ifFalse, ctx, found);
      }
      return;
    }
    case 'switch': {
      const key = node.select(ctx);
      const next = key && node.cases[key];

      if (!next) {
        // If default exists, use it (intentional fallback for unhandled cases)
        if (node.default) {
          await evalNode(node.default, ctx, found);
          return;
        }
        // If no default and key exists but is not in cases, and field is required, throw error
        if (key && node.required && node.required.length > 0) {
          const requiredField = node.required[0]; // Get the field used for the switch
          throw new Error(
            `Node ${node.id}: Unsupported value "${key}" for required field "${requiredField}". Supported values: ${Object.keys(node.cases).join(', ')}`,
          );
        }
        // If no default and no key, just return
        return;
      }

      await evalNode(next, ctx, found);
      return;
    }
    default: {
      throw new Error(`Unknown decision node kind: ${JSON.stringify(node)}`);
    }
  }
}

export async function runDecisionTree(ctx: SituationContext): Promise<EntiteAdminType[]> {
  const found = new Set<EntiteAdminType>();

  await evalNode(rootNode, ctx, found);

  return Array.from(found);
}
