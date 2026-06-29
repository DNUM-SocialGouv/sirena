import { prisma } from '@sirena/db';
import { createDefaultLogger } from '../../../../helpers/pino.js';
import { SirecTranscoError } from '../sirecTransco.error.js';
import { AFFECTATION_ENTITES_ILE_DE_FRANCE } from './entitesIleDeFrance.js';
import { AFFECTATION_ENTITES_NORMANDIE } from './entitesNormandie.js';
import { AFFECTATION_ENTITES_OCCITANIE } from './entitesOccitanie.js';
import { AFFECTATION_ENTITES_TOP_LEVEL } from './entitesTopLevel.js';

const logger = createDefaultLogger();

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
    throw new Error(`SIRENA Entity not found: "${sirenaLabels.label}" under "${ancestry}"`);
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
    ...AFFECTATION_ENTITES_ILE_DE_FRANCE,
    ...AFFECTATION_ENTITES_NORMANDIE,
    ...AFFECTATION_ENTITES_OCCITANIE,
  })) {
    const sirecId = Number(sirecIdStr);
    try {
      const firstEntity = entitesSirenaLabels[0];
      const topLevelLabel = firstEntity.grandParentLabel ?? firstEntity.parentLabel ?? firstEntity.label;
      const topLevelEntity = entities.find(
        (e) => normalize(e.nomComplet) === normalize(topLevelLabel) && !e.entiteMere,
      );
      if (!topLevelEntity) continue;
      const serviceEntiteIds = entitesSirenaLabels
        .filter((s): s is EntiteSirenaLabels & { parentLabel: string } => s.parentLabel !== undefined)
        .map((s) => findEntityId(entities, s));
      newTransco.set(sirecId, { topLevelEntiteId: topLevelEntity.id, serviceEntiteIds });
    } catch (err) {
      logger.warn({ err, sirecId }, 'SIREC Entity not found in SIRENA, ignored during initialization');
    }
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
    throw new Error('initAffectationTransco() must be called before transcodeAffectation()');
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
