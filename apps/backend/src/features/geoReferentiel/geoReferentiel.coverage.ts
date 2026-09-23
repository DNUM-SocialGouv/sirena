import { prisma } from '../../libs/prisma.js';
import { type CtcdEntiteType, getCtcdCodeCandidates } from '../dematSocial/affectation/geo/ctcdMatching.js';
import type { CoverageReport, MissingEntite } from './geoReferentiel.type.js';

const CTCD_ENTITE_TYPES: readonly CtcdEntiteType[] = ['CD', 'DD'];

const entiteKey = (entiteType: string, departementCode: string, ctcdCode: string) =>
  `${entiteType}|${departementCode}|${ctcdCode}`;

/**
 * Recense les territoires du référentiel qui n'ont pas d'entité racine CD ou DDETS en face.
 *
 * Une requête localisée sur un tel territoire ne trouve pas son entité et bascule vers le
 * repli régional : le rapport rend ces trous visibles au lieu de les laisser se manifester
 * en production. Certains sont légitimes — les collectivités d'outre-mer n'ont ni conseil
 * départemental ni DDETS — d'où un simple signalement, sans échec du job.
 *
 * Le rapprochement reprend exactement le prédicat utilisé par l'affectation, pour qu'un
 * territoire compté comme couvert ici le soit aussi au moment de l'affectation réelle.
 */
export const buildEntiteCoverageReport = async (): Promise<CoverageReport> => {
  const territoires = await prisma.commune.findMany({
    distinct: ['dptCodeActuel', 'ctcdCodeActuel'],
    select: { dptCodeActuel: true, dptLibActuel: true, ctcdCodeActuel: true, ctcdLibActuel: true },
    orderBy: [{ dptCodeActuel: 'asc' }, { ctcdCodeActuel: 'asc' }],
  });

  const entites = await prisma.entite.findMany({
    where: { entiteTypeId: { in: [...CTCD_ENTITE_TYPES] }, entiteMereId: null },
    select: { entiteTypeId: true, departementCode: true, ctcdCode: true },
  });

  const index = new Set(
    entites.map((entite) => entiteKey(entite.entiteTypeId, entite.departementCode ?? '', entite.ctcdCode ?? '')),
  );

  const missing: MissingEntite[] = [];

  for (const territoire of territoires) {
    for (const entiteType of CTCD_ENTITE_TYPES) {
      const covered = getCtcdCodeCandidates(territoire.dptCodeActuel, territoire.ctcdCodeActuel, entiteType).some(
        (ctcdCode) => index.has(entiteKey(entiteType, territoire.dptCodeActuel, ctcdCode)),
      );

      if (!covered) {
        missing.push({
          entiteType,
          departementCode: territoire.dptCodeActuel,
          departementLib: territoire.dptLibActuel,
          ctcdCode: territoire.ctcdCodeActuel,
          ctcdLib: territoire.ctcdLibActuel,
        });
      }
    }
  }

  return {
    territoiresCount: territoires.length,
    missingCdCount: missing.filter((item) => item.entiteType === 'CD').length,
    missingDdCount: missing.filter((item) => item.entiteType === 'DD').length,
    missing,
  };
};
