import { prisma } from '@sirena/db';
import { SirecTranscoError } from '../sirecTransco.error.js';
import { AFFECTATION_ENTITES_NORMANDIE } from './entitesNormandie.js';
import { AFFECTATION_ENTITES_TOP_LEVEL } from './entitesTopLevel.js';

export interface EntiteSirenaLabels {
  label: string;
  parentLabel?: string;
  grandParentLabel?: string;
}
interface AffectationEntry {
  topLevelEntiteId: string;
  serviceEntiteIds: string[];
}

let transco: Map<number, AffectationEntry> | null = null;
let arsEntiteIdSet: Set<string> = new Set();

type EntiteRow = {
  id: string;
  nomComplet: string;
  entiteMere: { id: string; nomComplet: string; entiteMere: { id: string; nomComplet: string } | null } | null;
};

const normalize = (s: string) => s.normalize('NFC').replace(/['’ʼ]/g, "'");

function findEntityId(entities: EntiteRow[], sirenaLabels: EntiteSirenaLabels & { parentLabel: string }): string {
  const match = entities.find(
    (e) =>
      normalize(e.nomComplet) === normalize(sirenaLabels.label) &&
      (e.entiteMere ? normalize(e.entiteMere.nomComplet) : undefined) === normalize(sirenaLabels.parentLabel) &&
      (sirenaLabels.grandParentLabel === undefined ||
        (e.entiteMere?.entiteMere ? normalize(e.entiteMere.entiteMere.nomComplet) : undefined) ===
          normalize(sirenaLabels.grandParentLabel)),
  );
  if (!match) {
    const ancestry = [sirenaLabels.grandParentLabel, sirenaLabels.parentLabel].filter(Boolean).join(' > ');
    throw new Error(`Entité SIRENA introuvable: "${sirenaLabels.label}" sous "${ancestry}"`);
  }
  return match.id;
}

export async function initAffectationTransco(): Promise<void> {
  const entities = await prisma.entite.findMany({
    select: {
      id: true,
      nomComplet: true,
      entiteMere: {
        select: {
          id: true,
          nomComplet: true,
          entiteMere: { select: { id: true, nomComplet: true } },
        },
      },
    },
  });

  const newTransco = new Map<number, AffectationEntry>();
  for (const [sirecIdStr, entitesSirenaLabels] of Object.entries({
    ...AFFECTATION_ENTITES_TOP_LEVEL,
    ...AFFECTATION_ENTITES_NORMANDIE,
  })) {
    const sirecId = Number(sirecIdStr);
    const firstEntity = entitesSirenaLabels[0];
    const topLevelLabel = firstEntity.grandParentLabel ?? firstEntity.parentLabel ?? firstEntity.label;
    const topLevelEntity = entities.find((e) => normalize(e.nomComplet) === normalize(topLevelLabel) && !e.entiteMere);
    if (!topLevelEntity) throw new Error(`Entité SIRENA introuvable: "${topLevelLabel}" (sans entité mère)`);
    const serviceEntiteIds = entitesSirenaLabels
      .filter((s): s is EntiteSirenaLabels & { parentLabel: string } => s.parentLabel !== undefined)
      .map((s) => findEntityId(entities, s));
    newTransco.set(sirecId, { topLevelEntiteId: topLevelEntity.id, serviceEntiteIds });
  }

  transco = newTransco;
  arsEntiteIdSet = new Set([...newTransco.values()].map((e) => e.topLevelEntiteId));
}

export interface AffectationEntites {
  requeteEntiteIds: string[];
  situationEntiteIds: string[];
}

export function filterArsEntiteIds(entiteIds: string[]): string[] {
  return entiteIds.filter((id) => arsEntiteIdSet.has(id));
}

export function transcodeAffectation(idSirec: number): AffectationEntites {
  if (transco === null) {
    throw new Error('initAffectationTransco() doit être appelé avant transcodeAffectation()');
  }
  const entry = transco.get(idSirec);
  if (entry !== undefined) {
    return {
      requeteEntiteIds: [entry.topLevelEntiteId],
      situationEntiteIds: [...entry.serviceEntiteIds, entry.topLevelEntiteId],
    };
  }
  throw new SirecTranscoError(idSirec, 'affectation');
}
