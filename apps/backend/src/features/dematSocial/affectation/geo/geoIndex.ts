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
  });

  if (!inseePostal || !inseePostal.commune) {
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
