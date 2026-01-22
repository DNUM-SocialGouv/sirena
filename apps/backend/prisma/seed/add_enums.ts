import {
  ageLabels,
  autoriteTypeLabels,
  autreProfessionnelPrecisionLabels,
  civiliteLabels,
  consequenceLabels,
  demarcheEngageeLabels,
  entiteTypes,
  lienVictimeLabels,
  lieuTypeLabels,
  MOTIFS_DATA,
  maltraitanceTypeLabels,
  misEnCauseAutreNonProPrecisionLabels,
  misEnCauseEtablissementPrecisionLabels,
  misEnCauseFamillePrecisionLabels,
  misEnCauseProchePrecisionLabels,
  misEnCauseTypeLabels,
  motifLabels,
  professionDomicileTypeLabels,
  professionSantePrecisionLabels,
  professionSocialPrecisionLabels,
  professionTypeLabels,
  receptionTypeLabels,
  requeteClotureReasonLabels,
  requeteEtapeStatutType,
  requetePrioriteType,
  roles,
  statutTypes,
  transportTypeLabels,
} from '@sirena/common/constants';
import type { Prisma, PrismaClient } from '../../generated/client/index.js';
import { getLoggerStore } from '../../src/libs/asyncLocalStorage.js';

async function seedAgeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(ageLabels)) {
    const exists = await prisma.ageEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.ageEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'ageEnum', added };
}

async function seedAutoritesTypes(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(autoriteTypeLabels)) {
    const exists = await prisma.autoriteTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.autoriteTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'autoriteTypeEnum', added };
}

async function seedCiviliteEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(civiliteLabels)) {
    const exists = await prisma.civiliteEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.civiliteEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'civiliteEnum', added };
}

async function seedConsequenceEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(consequenceLabels)) {
    const exists = await prisma.consequenceEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.consequenceEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'consequenceEnum', added };
}

async function seedDemarchesEngageesEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(demarcheEngageeLabels)) {
    const exists = await prisma.demarchesEngageesEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.demarchesEngageesEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'demarchesEngagees', added };
}

async function seedEntiteTypeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(entiteTypes)) {
    const exists = await prisma.entiteTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.entiteTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'entiteEnum', added };
}

async function seedLienVictimeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(lienVictimeLabels)) {
    const exists = await prisma.lienVictimeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.lienVictimeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'lienVictimeEnum', added };
}

async function seedLieuTypeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(lieuTypeLabels)) {
    const exists = await prisma.lieuTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.lieuTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'lieuTypeEnum', added };
}

async function seedMaltraitanceTypeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(maltraitanceTypeLabels)) {
    const exists = await prisma.maltraitanceTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.maltraitanceTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'maltraitanceTypeEnum', added };
}

async function seedMisEnCauseTypeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(misEnCauseTypeLabels)) {
    const exists = await prisma.misEnCauseTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.misEnCauseTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'misEnCauseTypeEnum', added };
}

async function seedMotifEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;

  for (const motif of MOTIFS_DATA) {
    const exists = await prisma.motifEnum.findUnique({ where: { id: motif.id } });
    if (!exists) {
      await prisma.motifEnum.create({
        data: {
          id: motif.id,
          label: motif.label,
        },
      });
      added++;
    }
  }
  return { table: 'motifEnum', added };
}

async function seedMotifDeclaratifEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;

  for (const [id, label] of Object.entries(motifLabels)) {
    const exists = await prisma.motifDeclaratifEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.motifDeclaratifEnum.create({
        data: {
          id,
          label,
        },
      });
      added++;
    }
  }

  return { table: 'motifDeclaratifEnum', added };
}

async function seedMisEnCauseTypePrecisionEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;

  // Helper to add precisions for a given parent type
  const addPrecisions = async (parentTypeId: string, precisionLabels: Record<string, string>) => {
    for (const [id, label] of Object.entries(precisionLabels)) {
      const exists = await prisma.misEnCauseTypePrecisionEnum.findUnique({
        where: {
          misEnCauseTypeId_id: {
            misEnCauseTypeId: parentTypeId,
            id,
          },
        },
      });
      if (!exists) {
        await prisma.misEnCauseTypePrecisionEnum.create({
          data: {
            id,
            label,
            misEnCauseTypeId: parentTypeId,
          },
        });
        added++;
      }
    }
  };

  /**
   * Link precisions to existing MisEnCauseTypeEnum ids.
   * The parent ids must match misEnCauseTypeLabels (PROFESSIONNEL, AUTRE, etc.).
   */
  await addPrecisions('MEMBRE_FAMILLE', misEnCauseFamillePrecisionLabels);
  await addPrecisions('PROCHE', misEnCauseProchePrecisionLabels);
  await addPrecisions('AUTRE_PERSONNE_NON_PRO', misEnCauseAutreNonProPrecisionLabels);
  await addPrecisions('PROFESSIONNEL_SANTE', professionSantePrecisionLabels);
  await addPrecisions('PROFESSIONNEL_SOCIAL', professionSocialPrecisionLabels);
  await addPrecisions('AUTRE_PROFESSIONNEL', autreProfessionnelPrecisionLabels);
  await addPrecisions('ETABLISSEMENT', misEnCauseEtablissementPrecisionLabels);

  // Also seed old DematSocial enum values for backward compatibility
  await addPrecisions('PROFESSIONNEL_SANTE', professionTypeLabels);
  await addPrecisions('PROFESSIONNEL_SANTE', professionDomicileTypeLabels);

  return { table: 'misEnCauseTypePrecisionEnum', added };
}

async function seedReceptionTypeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(receptionTypeLabels)) {
    const exists = await prisma.receptionTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.receptionTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'receptionTypeEnum', added };
}

async function seedRequeteEtapeStatutEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(requeteEtapeStatutType)) {
    const exists = await prisma.requeteEtapeStatutEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.requeteEtapeStatutEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'requeteEtapeStatutEnum', added };
}

async function seedRequetePrioriteEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  // Get correct order
  const prioriteEntries = Object.entries(requetePrioriteType).reverse();

  for (let i = 0; i < prioriteEntries.length; i++) {
    const [id, label] = prioriteEntries[i];
    const sortOrder = prioriteEntries.length - i;

    const exists = await prisma.requetePrioriteEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.requetePrioriteEnum.create({
        data: { id, label, sortOrder },
      });
      added++;
    } else {
      // ensure order is set
      await prisma.requetePrioriteEnum.update({
        where: { id },
        data: { sortOrder },
      });
    }
  }
  return { table: 'requetePrioriteEnum', added };
}

async function seedRoleEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(roles)) {
    const exists = await prisma.roleEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.roleEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'roleEnum', added };
}

async function seedStatutEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(statutTypes)) {
    const exists = await prisma.statutEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.statutEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'statutEnum', added };
}

async function seedTransportTypeEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(transportTypeLabels)) {
    const exists = await prisma.transportTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.transportTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'transportTypeEnum', added };
}

async function seedRequeteClotureReasonEnum(prisma: PrismaClient | Prisma.TransactionClient) {
  let added = 0;
  for (const [id, label] of Object.entries(requeteClotureReasonLabels)) {
    const exists = await prisma.requeteClotureReasonEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.requeteClotureReasonEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'requeteClotureReasonEnum', added };
}

type SeedFunction = (prisma: PrismaClient | Prisma.TransactionClient) => Promise<{ table: string; added: number }>;

async function seedLevel(
  level: number,
  seedFunctions: SeedFunction[],
  prisma: PrismaClient | Prisma.TransactionClient,
): Promise<PromiseSettledResult<{ table: string; added: number }>[]> {
  const logger = getLoggerStore();
  logger.info(`  📊 Seeding Level ${level}: ${level === 0 ? 'Base enums (no dependencies)' : 'Dependent enums'}`);

  const results = await Promise.allSettled(seedFunctions.map((fn) => fn(prisma)));

  for (const result of results) {
    if (result.status === 'fulfilled') {
      logger.info(`    ✅ ${result.value.table} : ${result.value.added} ajoutés`);
    } else {
      logger.error({ err: result.reason }, `    ❌ Erreur pendant le seeding Level ${level}`);
    }
  }

  return results;
}

export async function seedEnums(prisma: PrismaClient | Prisma.TransactionClient) {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des enums...');

  await seedLevel(
    0,
    [
      seedAgeEnum,
      seedAutoritesTypes,
      seedCiviliteEnum,
      seedConsequenceEnum,
      seedDemarchesEngageesEnum,
      seedEntiteTypeEnum,
      seedLienVictimeEnum,
      seedLieuTypeEnum,
      seedMaltraitanceTypeEnum,
      seedMisEnCauseTypeEnum,
      seedMotifEnum,
      seedMotifDeclaratifEnum,
      seedReceptionTypeEnum,
      seedRequeteClotureReasonEnum,
      seedRequeteEtapeStatutEnum,
      seedRequetePrioriteEnum,
      seedRoleEnum,
      seedStatutEnum,
      seedTransportTypeEnum,
    ],
    prisma,
  );

  await seedLevel(1, [seedMisEnCauseTypePrecisionEnum], prisma);

  logger.info('🎉 Seeding pour des enums terminé !');
}
