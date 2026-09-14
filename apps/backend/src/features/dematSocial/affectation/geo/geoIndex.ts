import { prisma } from '../../../../libs/prisma.js';

export type GeoEntite = {
  inseeCode: string;
  postalCode: string;
  departementCode: string;
  ctcdCode: string;
  departementName: string;
  regionCode: string;
  regionName: string;
};

/**
 * Finds geo entity by postal code from database
 *
 * Un code postal peut couvrir plusieurs communes, parfois de départements différents : le tri
 * sur le code INSEE fixe laquelle répond, sinon la synchronisation mensuelle du référentiel —
 * qui recrée les lignes, donc leurs identifiants — changerait l'affectation d'un mois à l'autre.
 *
 * @param cp - Postal code (code postal)
 * @returns GeoEntite or null if not found
 */
export async function findGeoByPostalCode(cp: string): Promise<GeoEntite | null> {
  const inseePostal = await prisma.inseePostal.findFirst({
    where: {
      codePostal: cp,
    },
    include: {
      commune: true,
    },
    orderBy: {
      codeInsee: 'asc',
    },
  });

  if (!inseePostal?.commune) {
    return null;
  }

  return {
    inseeCode: inseePostal.codeInsee,
    postalCode: inseePostal.codePostal,
    departementCode: inseePostal.commune.dptCodeActuel,
    ctcdCode: inseePostal.commune.ctcdCodeActuel,
    departementName: inseePostal.commune.dptLibActuel,
    regionCode: inseePostal.commune.regCodeActuel,
    regionName: inseePostal.commune.regLibActuel,
  };
}
