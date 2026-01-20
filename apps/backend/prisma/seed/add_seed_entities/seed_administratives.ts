import { z } from 'zod';
import type { PrismaClient } from '../../../generated/client/index.js';
import { parseCsv } from '../../helpers/parseCsv.js';

const AdministrativeRowSchema = z.object({
  Libellé: z.string().min(1),
  'Libéllé court': z.string().min(1),
  "Type d'entité": z.string().min(1),
  'Domaine mail': z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  Organizational_unit: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  departement_code: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  region_code: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  ctcd_code: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  REG_LIB: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  DPT_LIB: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  Actif: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1' || v === 'TRUE' || v === 'True' || v === 'Oui' || v === 'oui'),
});

export async function seedAdministratives(prisma: PrismaClient) {
  return await parseCsv('./prisma/documents/administratives.csv', AdministrativeRowSchema, async (rows) => {
    const existing = await prisma.entite.findMany({
      where: {
        OR: rows.map((row) => ({
          nomComplet: row.Libellé,
          entiteMereId: null,
        })),
      },
      select: {
        nomComplet: true,
        entiteMereId: true,
      },
    });

    const newEntities = rows
      .filter((row) => !existing.find((e) => e.nomComplet === row.Libellé && e.entiteMereId === null))
      .map((row) => ({
        nomComplet: row.Libellé,
        label: row['Libéllé court'],
        emailDomain: row['Domaine mail'] ?? '',
        organizationalUnit: row.Organizational_unit ?? '',
        entiteTypeId: row["Type d'entité"],
        departementCode: row.departement_code,
        ctcdCode: row.ctcd_code,
        regionCode: row.region_code,
        regLib: row.REG_LIB,
        dptLib: row.DPT_LIB,
        isActive: row.Actif,
      }));

    const createdEntities = await prisma.entite.createMany({
      data: newEntities,
      skipDuplicates: true,
    });

    return { table: 'administratives in entite', added: createdEntities.count };
  });
}
