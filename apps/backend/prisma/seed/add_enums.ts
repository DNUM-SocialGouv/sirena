import {
  ageLabels,
  autoriteTypeLabels,
  civiliteLabels,
  consequenceLabels,
  demarcheEngageeLabels,
  entiteTypes,
  lienVictimeLabels,
  lieuTypeLabels,
  maltraitanceTypeLabels,
  misEnCauseTypeLabels,
  motifLabels,
  professionDomicileTypeLabels,
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

async function seedProfessionDomicileTypeEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(professionDomicileTypeLabels)) {
    const exists = await prisma.professionDomicileTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.professionDomicileTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'professionDomicileTypeEnum', added };
}

async function seedProfessionTypeEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(professionTypeLabels)) {
    const exists = await prisma.professionTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.professionTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'professionTypeEnum', added };
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
    seedMotifEnum(prisma),
    seedProfessionDomicileTypeEnum(prisma),
    seedProfessionTypeEnum(prisma),
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
