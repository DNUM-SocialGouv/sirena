import { getLoggerStore } from '@/libs/asyncLocalStorage';
import type { PrismaClient } from '../../generated/client';
import inseePostalRaw from '../documents/inseetocodepostal.json';
import listeEntitesRaw from '../documents/liste_entites.json';

type InseePostalRow = {
  codeInsee: string;
  nomCommune: string;
  codePostal: string;
  libelleAcheminement: string | null;
  ligne5: string | null;
};

type ListeEntiteRow = {
  COM_CODE: string;
  COM_LIB: string;
  METOMER_LIB: string;
  CTCD_CODE_ACTUEL: string;
  CTCD_LIB_ACTUEL: string;
  DPT_CODE_ACTUEL: string;
  DPT_LIB_ACTUEL: string;
  REG_CODE_ACTUEL: string;
  REG_LIB_ACTUEL: string;
};

const inseePostal = inseePostalRaw as InseePostalRow[];
const listeEntites = listeEntitesRaw as ListeEntiteRow[];

export async function importGeoData(prisma: PrismaClient) {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des données géographiques...');

  const batchSize = 1000;
  let communesInserted = 0;
  let inseePostalInserted = 0;

  // 1. Import communes
  for (let i = 0; i < listeEntites.length; i += batchSize) {
    const batch = listeEntites.slice(i, i + batchSize);
    const result = await prisma.commune.createMany({
      data: batch.map((row) => ({
        comCode: row.COM_CODE,
        comLib: row.COM_LIB,
        metomerLib: row.METOMER_LIB,
        ctcdCodeActuel: row.CTCD_CODE_ACTUEL,
        ctcdLibActuel: row.CTCD_LIB_ACTUEL,
        dptCodeActuel: row.DPT_CODE_ACTUEL,
        dptLibActuel: row.DPT_LIB_ACTUEL,
        regCodeActuel: row.REG_CODE_ACTUEL,
        regLibActuel: row.REG_LIB_ACTUEL,
      })),
      skipDuplicates: true,
    });
    communesInserted += result.count;
  }

  // 2. Prepare valid commune codes set for filtering
  // This ensures we only insert InseePostal that have a corresponding Commune
  // This filters out COM (Collectivités d'outre-mer) and Monaco that are not departments:
  // - 977xx (Saint-Barthélemy)
  // - 978xx (Saint-Martin)
  // - 986xx (Wallis-et-Futuna)
  // - 987xx (Polynésie française)
  // - 988xx (Nouvelle-Calédonie)
  // - 989xx (Île de Clipperton)
  // - 99138 (Monaco)
  const validCommuneCodes = new Set(listeEntites.map((row) => row.COM_CODE));

  // 3. Filter inseePostal to only include rows with valid commune codes
  const validInseePostal = inseePostal.filter((row) => validCommuneCodes.has(row.codeInsee));
  const filteredCount = inseePostal.length - validInseePostal.length;

  // 4. Import insee-postal mappings
  for (let i = 0; i < validInseePostal.length; i += batchSize) {
    const batch = validInseePostal.slice(i, i + batchSize);
    const result = await prisma.inseePostal.createMany({
      data: batch.map((row) => ({
        codeInsee: row.codeInsee,
        nomCommune: row.nomCommune,
        codePostal: row.codePostal,
        libelleAcheminement: row.libelleAcheminement,
        ligne5: row.ligne5,
      })),
      skipDuplicates: true,
    });
    inseePostalInserted += result.count;
  }

  logger.info(`  ✅ Communes : ${communesInserted} ajoutés`);
  logger.info(`  ✅ InseePostal : ${inseePostalInserted} ajoutés`);
  if (filteredCount > 0) {
    logger.info(`  ⚠️  ${filteredCount} InseePostal filtrés (COM and Monaco)`);
  }

  logger.info('🎉 Seeding des données géographiques terminé !');
}
