import {
  ages,
  civilites,
  consequences,
  liensVictime,
  lieuTypes,
  maltraitanceTypes,
  motifs,
  natureLieux,
  professionTypes,
  receptionTypes,
  servicesDomicile,
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

async function seedLiensVictimeEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(liensVictime)) {
    const exists = await prisma.lienVictimeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.lienVictimeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'consequenceEnum', added };
}

async function seedLieuTypes(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(lieuTypes)) {
    const exists = await prisma.lieuTypeEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.lieuTypeEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'consequenceEnum', added };
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

async function seedNatureLieuEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(natureLieux)) {
    const exists = await prisma.natureLieuEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.natureLieuEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'natureLieuEnum', added };
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

async function seedServiceDomicileEnum(prisma: PrismaClient) {
  let added = 0;
  for (const [id, label] of Object.entries(servicesDomicile)) {
    const exists = await prisma.serviceDomicileEnum.findUnique({ where: { id } });
    if (!exists) {
      await prisma.serviceDomicileEnum.create({ data: { id, label } });
      added++;
    }
  }
  return { table: 'serviceDomicileEnum', added };
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

export async function seed_enums_for_requete(prisma: PrismaClient) {
  console.log('🌱 Début du seeding pour requetes...');

  const results = await Promise.allSettled([
    seedAgeEnum(prisma),
    seedCiviliteEnum(prisma),
    seedConsequenceEnum(prisma),
    seedLiensVictimeEnum(prisma),
    seedLieuTypes(prisma),
    seedMaltraitanceTypeEnum(prisma),
    seedMotifEnum(prisma),
    seedNatureLieuEnum(prisma),
    seedProfessionTypeEnum(prisma),
    seedReceptionTypeEnum(prisma),
    seedServiceDomicileEnum(prisma),
    seedTransportTypeEnum(prisma),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`✅ ${result.value.table} : ${result.value.added} ajoutés`);
    } else {
      console.log('❌ Erreur pendant le seeding :', result.reason);
    }
  }

  console.log('🎉 Seeding pour les requetes terminé !');
}
