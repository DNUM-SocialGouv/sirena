import {
  ages,
  civilites,
  consequences,
  entiteTypes,
  liensVictime,
  lieuTypes,
  maltraitanceTypes,
  misEnCauseTypes,
  motifs,
  professionDomicileTypes,
  professionTypes,
  receptionTypes,
  requeteStatutType,
  roles,
  statutTypes,
  transportTypes,
} from '@sirena/common/constants';

import type { PrismaClient } from 'generated/client';

async function seedAgeEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(ages)) {
    const exists = await prisma.ageEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.ageEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'ageEnum', added };
}

async function seedCiviliteEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(civilites)) {
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
  for (const [id, label] of Object.entries(consequences)) {
    const exists = await prisma.consequenceEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.consequenceEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'consequenceEnum', added };
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
  for (const [id, label] of Object.entries(liensVictime)) {
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
  for (const [id, label] of Object.entries(lieuTypes)) {
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
  for (const [id, label] of Object.entries(maltraitanceTypes)) {
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
  for (const [id, label] of Object.entries(misEnCauseTypes)) {
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
  for (const [id, label] of Object.entries(motifs)) {
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
  for (const [id, label] of Object.entries(professionDomicileTypes)) {
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
  for (const [id, label] of Object.entries(professionTypes)) {
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
  for (const [id, label] of Object.entries(receptionTypes)) {
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
  for (const [id, label] of Object.entries(transportTypes)) {
    const exists = await prisma.transportTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.transportTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'transportTypeEnum', added };
}

export async function seedEnums(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des enums...');

  // TODO: remove this (we purge the actual status for new one)
  await prisma.requeteEtapeNote.deleteMany({});
  await prisma.requeteEtape.deleteMany({});
  await prisma.requeteEntite.deleteMany({});
  await prisma.requete.deleteMany({});
  await prisma.requeteStatutEnum.deleteMany({});
  await prisma.receptionTypeEnum.deleteMany({});

  const results = await Promise.allSettled([
    seedAgeEnum(prisma),
    seedCiviliteEnum(prisma),
    seedConsequenceEnum(prisma),
    seedEntiteTypeEnum(prisma),
    seedLienVictimeEnum(prisma),
    seedLieuTypeEnum(prisma),
    seedMaltraitanceTypeEnum(prisma),
    seedMisEnCauseTypeEnum(prisma),
    seedMotifEnum(prisma),
    seedProfessionDomicileTypeEnum(prisma),
    seedProfessionTypeEnum(prisma),
    seedReceptionTypeEnum(prisma),
    seedRequeteStatutEnum(prisma),
    seedRoleEnum(prisma),
    seedStatutEnum(prisma),
    seedTransportTypeEnum(prisma),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`  ✅ ${result.value.table} : ${result.value.added} ajoutés`);
    } else {
      console.log('  ❌ Erreur pendant le seeding :', result.reason);
    }
  }

  console.log('🎉 Seeding pour des enums terminé !');
}
