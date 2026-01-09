import {
  type DsMotif,
  type MisEnCauseType,
  type Motif,
  PROFESSION_DOMICILE_TYPE,
  PROFESSION_SANTE_PRECISION,
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

export function computeEntitesFromMotifs(ctx: SituationContext): EntiteAdminType[] {
  const acc = new Set<EntiteAdminType>();

  const motifsDeclaratifs = ctx.motifsDeclaratifs ?? [];

  for (const motif of motifsDeclaratifs) {
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

type DomicileProfessionnelCategory =
  | 'PROFESSIONNEL_SANTE'
  | 'SERVICE_AIDE_DOMICILE'
  | 'SESSAD'
  | 'TUTEUR_MJPM'
  | 'AUTRE';

const DOMICILE_PROFESSIONNEL_MAPPING: Record<DomicileProfessionnelCategory, EntiteAdminType[]> = {
  PROFESSIONNEL_SANTE: ['ARS'],
  SERVICE_AIDE_DOMICILE: ['CD'],
  SESSAD: ['ARS'],
  TUTEUR_MJPM: ['DD'],
  AUTRE: ['CD'],
};

function getDomicileProfessionnelCategory(ctx: SituationContext): DomicileProfessionnelCategory | null {
  const { misEnCauseType, misEnCauseTypePrecision } = ctx;

  // 4. Tuteur/MJPM
  if (misEnCauseType === 'NPJM' || misEnCauseTypePrecision === 'MJPM') {
    return 'TUTEUR_MJPM';
  }

  // Special case : PROFESSIONNEL_SANTE
  if (misEnCauseType === 'PROFESSIONNEL_SANTE') {
    // 3. SESSAD
    if (misEnCauseTypePrecision === 'SESSAD') {
      return 'SESSAD';
    }

    // 2. Service d'aide à domicile (ProfessionDomicileType but not SESSAD)
    if (misEnCauseTypePrecision && Object.keys(PROFESSION_DOMICILE_TYPE).includes(misEnCauseTypePrecision)) {
      return 'SERVICE_AIDE_DOMICILE';
    }

    // 1. Professionnel de santé (ProfessionSantePrecision)
    if (misEnCauseTypePrecision && Object.keys(PROFESSION_SANTE_PRECISION).includes(misEnCauseTypePrecision)) {
      return 'PROFESSIONNEL_SANTE';
    }

    // Default case : PROFESSIONNEL_SANTE
    return 'PROFESSIONNEL_SANTE';
  }

  // 5. Autre (PROFESSIONNEL_SOCIAL, AUTRE_PROFESSIONNEL, ...)
  return 'AUTRE';
}

const MOTIF_DECLARATIFS_TO_ENTITES: Partial<Record<Motif | DsMotif, EntiteAdminType[]>> = {
  PROBLEME_QUALITE_SOINS: ['ARS'],
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
        ctx.misEnCauseType as MisEnCauseType, // cast because misEnCauseType is required below
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
    required: ['misEnCauseType'],
    select: (ctx) => getDomicileProfessionnelCategory(ctx) ?? null,
    cases: Object.fromEntries(
      Object.entries(DOMICILE_PROFESSIONNEL_MAPPING).map(([key, entites]) => [
        key,
        leaf(
          `domicile_pro_${key.toLowerCase()}`,
          `Domicile - ${key === 'PROFESSIONNEL_SANTE' ? 'Professionnel de santé' : key === 'SERVICE_AIDE_DOMICILE' ? "Service d'aide à domicile" : key === 'SESSAD' ? "Service d'éducation spéciale et de soins (SESSAD)" : key === 'TUTEUR_MJPM' ? 'Tuteur, curateur ou mandataire judiciaire' : 'Autre'}`,
          entites,
        ),
      ]),
    ),
  };
}

// 2 - NON DOMICILE SUBTREE
function nonDomicileSubtree(): DecisionNode {
  return {
    kind: 'branch',
    id: 'non_domicile_maltraitance',
    /*
    YES = One of the following answers is selected: "Manque de soins, de nourriture, d’hygiène ou de sécurité
    Insultes, coups, soin médical ou isolement forcé, autres violences Vol d’argent ou d’objets, confiscation Contact physique sans accord sur les parties intimes,  attouchements forcés, exhibitionnisme, relation sexuelle forcée"
    */
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
    description: 'Mis en cause : famille, proche, professionnel, établissement, tuteur, autre',
    select: (ctx): MisEnCauseType | 'TUTEUR_MJPM' | null => {
      // Tuteur/curateur/mandataire judiciaire : NPJM or MJPM via precision
      if (ctx.misEnCauseType === 'NPJM' || ctx.misEnCauseTypePrecision === 'MJPM') {
        return 'TUTEUR_MJPM';
      }

      return ctx.misEnCauseType ?? null;
    },
    required: ['misEnCauseType'],
    cases: {
      ETABLISSEMENT: {
        kind: 'leaf',
        id: 'maltraitance_etablissement',
        description: 'Maltraitance par un établissement',
        add: [],
        next: nonDomicileLieuDeSurvenue(),
      },
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
      TUTEUR_MJPM: {
        kind: 'leaf',
        id: 'maltraitance_tuteur_mjpm_add_dd',
        description: 'Maltraitance par un tuteur, curateur ou mandataire judiciaire',
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
        description: 'Lieu : établissement de santé (hôpital, clinique, laboratoire, pharmacie, cabinet médical…)',
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
// Processes each declared motif individually:
// - If PROBLEME_QUALITE_SOINS → assign ARS directly (skip FINESS)
// - Else → apply the FINESS referential for each
function motifReclamationSubtree(): DecisionNode {
  return {
    kind: 'forEach',
    id: 'motifs_reclamation_multi',
    description: 'Traitement de chaque motif déclaratif de la réclamation',
    // Iterate over all declared motifs
    iterate: (ctx: SituationContext) => ctx.motifsDeclaratifs ?? [],
    // Create a modified context with a single declared motif at a time
    mapContext: (ctx: SituationContext, motif: unknown) => ({
      ...ctx,
      motifsDeclaratifs: [motif as DsMotif],
    }),
    forEach: {
      kind: 'branch',
      id: 'motif_reclamation_single',
      description: "Traitement d'un motif déclaratif",
      predicate: (ctx: SituationContext) => {
        // If the motif is not PROBLEME_QUALITE_SOINS → FINESS required
        const motif = ctx.motifsDeclaratifs?.[0];
        return motif !== 'PROBLEME_QUALITE_SOINS';
      },
      // If the motif requires FINESS → apply the FINESS referential
      ifTrue: finessReferentielPlaceholderSubtree(),
      // If the motif is PROBLEME_QUALITE_SOINS → ARS directly and terminate
      ifFalse: leaf('motif_reclamation_qualite_soins_ars', 'Qualité des soins → ARS directement', ['ARS']),
    },
  };
}

// 6 - Referentiel FINESS
// TODO: implémenter le référentiel via FINESS
export function finessReferentielPlaceholderSubtree(): DecisionNode {
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
    case 'forEach': {
      const items = node.iterate(ctx);

      // For each item, create a modified context and apply the subtree
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Create a modified context for this item
        const itemContext = node.mapContext ? node.mapContext(ctx, item, i) : ctx;
        // Apply the subtree for this item
        await evalNode(node.forEach, itemContext, found, depth + 1);
      }

      // If an "after" node is defined, apply it after all iterations
      if (node.after) {
        await evalNode(node.after, ctx, found, depth + 1);
      }
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
