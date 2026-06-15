import { prisma } from '@sirena/db';
import { SirecTranscoError } from './sirecTransco.error.js';

const ARS_LABEL_TRANSCO: Record<number, string> = {
  667: 'ARS Auvergne-Rhône-Alpes',
  669: 'ARS Bourgogne-Franche-Comté',
  671: 'ARS Bretagne',
  673: 'ARS Centre-Val de Loire',
  675: 'ARS Corse',
  677: 'ARS Grand Est',
  679: 'ARS Guadeloupe',
  681: 'ARS Guyane',
  683: 'ARS Hauts-de-France',
  685: 'ARS Île-de-France',
  687: 'ARS La Réunion',
  689: 'ARS Martinique',
  691: 'ARS Mayotte',
  693: 'ARS Normandie',
  695: 'ARS Nouvelle-Aquitaine',
  697: 'ARS Occitanie',
  699: 'ARS Pays de la Loire',
  701: "ARS Provence-Alpes-Côte d'Azur",
};

interface ServiceLookupSpec {
  label: string;
  parentLabel: string;
  grandParentLabel?: string;
}

const SERVICES_LOOKUP_SPECS: Record<number, ServiceLookupSpec[]> = {
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

interface ServiceArsEntry {
  topLevelEntiteId: string;
  serviceEntiteIds: string[];
}

let arsTransco: Map<number, string> | null = null;
let serviceTransco: Map<number, ServiceArsEntry> | null = null;
let arsEntiteIdSet: Set<string> = new Set();

type EntiteRow = {
  id: string;
  label: string;
  entiteMere: { id: string; label: string; entiteMere: { id: string; label: string } | null } | null;
};

function findEntityId(entities: EntiteRow[], spec: ServiceLookupSpec): string {
  const match = entities.find(
    (e) =>
      e.label === spec.label &&
      e.entiteMere?.label === spec.parentLabel &&
      (spec.grandParentLabel === undefined || e.entiteMere?.entiteMere?.label === spec.grandParentLabel),
  );
  if (!match) {
    const ancestry = [spec.grandParentLabel, spec.parentLabel].filter(Boolean).join(' > ');
    throw new Error(`Entité SIRENA introuvable: "${spec.label}" sous "${ancestry}"`);
  }
  return match.id;
}

export async function initAffectationTransco(): Promise<void> {
  const entities = await prisma.entite.findMany({
    select: {
      id: true,
      label: true,
      entiteMere: {
        select: {
          id: true,
          label: true,
          entiteMere: { select: { id: true, label: true } },
        },
      },
    },
  });

  const newArsTransco = new Map<number, string>();
  for (const [sirecIdStr, arsLabel] of Object.entries(ARS_LABEL_TRANSCO)) {
    const sirecId = Number(sirecIdStr);
    const arsEntity = entities.find((e) => e.label === arsLabel && !e.entiteMere);
    if (!arsEntity) throw new Error(`Entité ARS SIRENA introuvable: "${arsLabel}"`);
    newArsTransco.set(sirecId, arsEntity.id);
  }

  const newServiceTransco = new Map<number, ServiceArsEntry>();
  for (const [sirecIdStr, specs] of Object.entries(SERVICES_LOOKUP_SPECS)) {
    const sirecId = Number(sirecIdStr);
    const topLevelLabel = specs[0].grandParentLabel ?? specs[0].parentLabel;
    const topLevelEntity = entities.find((e) => e.label === topLevelLabel && !e.entiteMere);
    if (!topLevelEntity) throw new Error(`Entité SIRENA introuvable: "${topLevelLabel}" (sans entité mère)`);
    const serviceEntiteIds = specs.map((spec) => findEntityId(entities, spec));
    newServiceTransco.set(sirecId, { topLevelEntiteId: topLevelEntity.id, serviceEntiteIds });
  }

  arsTransco = newArsTransco;
  serviceTransco = newServiceTransco;
  arsEntiteIdSet = new Set([
    ...newArsTransco.values(),
    ...[...newServiceTransco.values()].map((e) => e.topLevelEntiteId),
  ]);
}

export interface AffectationEntites {
  requeteEntiteIds: string[];
  situationEntiteIds: string[];
}

export function filterArsEntiteIds(entiteIds: string[]): string[] {
  return entiteIds.filter((id) => arsEntiteIdSet.has(id));
}

export function transcodeAffectation(idSirec: number): AffectationEntites {
  if (arsTransco === null || serviceTransco === null) {
    throw new Error('initAffectationTransco() doit être appelé avant transcodeAffectation()');
  }

  const arsEntiteId = arsTransco.get(idSirec);
  if (arsEntiteId !== undefined) {
    return { requeteEntiteIds: [arsEntiteId], situationEntiteIds: [] };
  }

  const serviceEntry = serviceTransco.get(idSirec);
  if (serviceEntry !== undefined) {
    return {
      requeteEntiteIds: [serviceEntry.topLevelEntiteId],
      situationEntiteIds: [...serviceEntry.serviceEntiteIds, serviceEntry.topLevelEntiteId],
    };
  }

  throw new SirecTranscoError(idSirec, 'affectation');
}
