import { prisma } from '@sirena/db';
import { SirecTranscoError } from './sirecTransco.error.js';

interface EntiteSirenaLabels {
  label: string;
  parentLabel?: string;
  grandParentLabel?: string;
}

const AFFECTATION_ENTITES: Record<number, [EntiteSirenaLabels, ...EntiteSirenaLabels[]]> = {
  667: [{ label: 'ARS Auvergne-Rhône-Alpes' }],
  669: [{ label: 'ARS Bourgogne-Franche-Comté' }],
  671: [{ label: 'ARS Bretagne' }],
  673: [{ label: 'ARS Centre-Val de Loire' }],
  675: [{ label: 'ARS Corse' }],
  677: [{ label: 'ARS Grand Est' }],
  679: [{ label: 'ARS Guadeloupe' }],
  681: [{ label: 'ARS Guyane' }],
  683: [{ label: 'ARS Hauts-de-France' }],
  685: [{ label: 'ARS Île-de-France' }],
  687: [{ label: 'ARS La Réunion' }],
  689: [{ label: 'ARS Martinique' }],
  691: [{ label: 'ARS Mayotte' }],
  693: [{ label: 'ARS Normandie' }],
  695: [{ label: 'ARS Nouvelle-Aquitaine' }],
  697: [{ label: 'ARS Occitanie' }],
  699: [{ label: 'ARS Pays de la Loire' }],
  701: [{ label: "ARS Provence-Alpes-Côte d'Azur" }],
  // Services Normandie
  1087: [{ label: 'Mission Inspection-Controle (MIC)', parentLabel: 'ARS Normandie' }],
  1089: [{ label: "Direction de l'Offre de Soin", parentLabel: 'ARS Normandie' }],
  1091: [
    {
      label: 'Pôle Offre Ambulatoire (POA)',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1093: [
    { label: 'Professions Non Médicales (PNM)', parentLabel: 'DAMTN', grandParentLabel: 'ARS Normandie' },
    { label: 'Professions Médicales (PM)', parentLabel: 'DAMTN', grandParentLabel: 'ARS Normandie' },
  ],
  1095: [{ label: 'PAJ', parentLabel: 'ARS Normandie' }],
  1097: [
    {
      label: 'Santé Environnement (SE) DD 14',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 27',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 50',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 61',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 76',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1099: [
    {
      label: 'Transports sanitaires 14',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Transports sanitaires 27',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Transports sanitaires 50',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Transports sanitaires 61',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Transports sanitaires 76',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1101: [
    {
      label: 'Pôle soins et sûreté des personnes 27-76',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1103: [
    {
      label: 'Pôle soins et sûreté des personnes 14-50-61',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1105: [{ label: 'DAMTN', parentLabel: 'ARS Normandie' }],
  1107: [
    {
      label: 'Pôle soins et sûreté des personnes 14-50-61',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1109: [{ label: 'DAMTN', parentLabel: 'ARS Normandie' }],
  1111: [
    {
      label: 'Santé Environnement (SE) DD 14',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 27',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 50',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 61',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
    {
      label: 'Santé Environnement (SE) DD 76',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1113: [{ label: 'Mission Inspection-Controle (MIC)', parentLabel: 'ARS Normandie' }],
  1115: [{ label: "Direction de l'Autonomie", parentLabel: 'ARS Normandie' }],
  1117: [{ label: 'Direction Autonomie Santé', parentLabel: 'DDETS de la Seine-Maritime' }],
  1119: [{ label: 'Direction Autonomie Santé', parentLabel: 'Conseil départemental du Calvados' }],
  1121: [{ label: 'Direction Autonomie Santé', parentLabel: "Conseil départemental de L'Eure" }],
  1123: [{ label: "Maison Départementale de l'autonomie", parentLabel: 'Conseil départemental de la Manche' }],
  1125: [{ label: "MDA (Maison Départementale de l'Autonomie)", parentLabel: "Conseil départemental de L'Orne" }],
  1127: [
    {
      label: 'Santé Environnement (SE) DD 76',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1129: [
    {
      label: 'Santé Environnement (SE) DD 14',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1131: [
    {
      label: 'Santé Environnement (SE) DD 27',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1133: [
    {
      label: 'Santé Environnement (SE) DD 50',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1135: [
    {
      label: 'Santé Environnement (SE) DD 61',
      parentLabel: 'Direction de la Santé Publique',
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1137: [
    {
      label: 'Transports sanitaires 76',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1139: [
    {
      label: 'Transports sanitaires 14',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1141: [
    {
      label: 'Transports sanitaires 27',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1143: [
    {
      label: 'Transports sanitaires 50',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
  1145: [
    {
      label: 'Transports sanitaires 61',
      parentLabel: "Direction de l'Offre de Soin",
      grandParentLabel: 'ARS Normandie',
    },
  ],
};

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
  for (const [sirecIdStr, entitesSirenaLabels] of Object.entries(AFFECTATION_ENTITES)) {
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
