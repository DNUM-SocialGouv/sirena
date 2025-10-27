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
  maltraitanceTypeLabels,
  misEnCauseAutreNonProPrecisionLabels,
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
  requeteStatutType,
  roles,
  statutTypes,
  transportTypeLabels,
} from '@sirena/common/constants';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import type { PrismaClient } from '../../generated/client';

async function seedAgeEnum(prisma: PrismaClient) {
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

async function seedAutoritesTypes(prisma: PrismaClient) {
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

async function seedCiviliteEnum(prisma: PrismaClient) {
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

async function seedConsequenceEnum(prisma: PrismaClient) {
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

async function seedDemarchesEngageesEnum(prisma: PrismaClient) {
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

async function seedEntiteTypeEnum(prisma: PrismaClient) {
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

async function seedLienVictimeEnum(prisma: PrismaClient) {
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

async function seedLieuTypeEnum(prisma: PrismaClient) {
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

async function seedMaltraitanceTypeEnum(prisma: PrismaClient) {
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

async function seedMisEnCauseTypeEnum(prisma: PrismaClient) {
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

async function seedMotifEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(motifLabels)) {
    const exists = await prisma.motifEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.motifEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'motifEnum', added };
}

async function seedMisEnCauseTypePrecisionEnum(prisma: PrismaClient) {
  let added = 0;

  // Helper to add precisions for a given parent type
  const addPrecisions = async (parentTypeId: string, precisionLabels: Record<string, string>) => {
    for (const [id, label] of Object.entries(precisionLabels)) {
      const exists = await prisma.misEnCauseTypePrecisionEnum.findUnique({ where: { id } });
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

  // Seed all precision types linked to their parent types
  await addPrecisions('MEMBRE_FAMILLE', misEnCauseFamillePrecisionLabels);
  await addPrecisions('PROCHE', misEnCauseProchePrecisionLabels);
  await addPrecisions('AUTRE_PERSONNE_NON_PRO', misEnCauseAutreNonProPrecisionLabels);
  await addPrecisions('PROFESSIONNEL_SANTE', professionSantePrecisionLabels);
  await addPrecisions('PROFESSIONNEL_SOCIAL', professionSocialPrecisionLabels);
  await addPrecisions('AUTRE_PROFESSIONNEL', autreProfessionnelPrecisionLabels);

  // Also seed old DematSocial enum values for backward compatibility
  await addPrecisions('PROFESSIONNEL_SANTE', professionTypeLabels);
  await addPrecisions('PROFESSIONNEL_SANTE', professionDomicileTypeLabels);

  return { table: 'misEnCauseTypePrecisionEnum', added };
}

async function seedReceptionTypeEnum(prisma: PrismaClient) {
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

async function seedRequeteStatutEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(requeteStatutType)) {
    const exists = await prisma.requeteStatutEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.requeteStatutEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'requeteStatutEnum', added };
}

async function seedRoleEnum(prisma: PrismaClient) {
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

async function seedStatutEnum(prisma: PrismaClient) {
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

async function seedTransportTypeEnum(prisma: PrismaClient) {
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

async function seedRequeteClotureReasonEnum(prisma: PrismaClient) {
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

export async function seedEnums(prisma: PrismaClient) {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des enums...');

  const results = await Promise.allSettled([
    seedAgeEnum(prisma),
    seedAutoritesTypes(prisma),
    seedCiviliteEnum(prisma),
    seedConsequenceEnum(prisma),
    seedDemarchesEngageesEnum(prisma),
    seedEntiteTypeEnum(prisma),
    seedLienVictimeEnum(prisma),
    seedLieuTypeEnum(prisma),
    seedMaltraitanceTypeEnum(prisma),
    seedMisEnCauseTypeEnum(prisma),
    seedMisEnCauseTypePrecisionEnum(prisma),
    seedMotifEnum(prisma),
    seedReceptionTypeEnum(prisma),
    seedRequeteClotureReasonEnum(prisma),
    seedRequeteStatutEnum(prisma),
    seedRoleEnum(prisma),
    seedStatutEnum(prisma),
    seedTransportTypeEnum(prisma),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      logger.info(`  ✅ ${result.value.table} : ${result.value.added} ajoutés`);
    } else {
      logger.info({ err: result.reason }, '  ❌ Erreur pendant le seeding');
    }
  }

  logger.info('🎉 Seeding pour des enums terminé !');
}
