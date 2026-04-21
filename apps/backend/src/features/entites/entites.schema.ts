import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { z } from 'zod';
import { Prisma } from '../../libs/prisma.js';

export const EntiteSchema = z.object({
  id: z.uuid(),
  nomComplet: z.string(),
  label: z.string(),
  email: z.string(),
  emailContactUsager: z.string(),
  telContactUsager: z.string(),
  adresseContactUsager: z.string(),
  emailDomain: z.string(),
  organizationalUnit: z.string(),
  entiteTypeId: z.string(),
  entiteMereId: z.string().nullable(),
  departementCode: z.string().nullable(),
  ctcdCode: z.string().nullable(),
  regionCode: z.string().nullable(),
  regLib: z.string().nullable(),
  dptLib: z.string().nullable(),
});

const EntiteAdminSchema = z.object({
  id: z.string(),
  nomComplet: z.string(),
  label: z.string(),
  isActive: z.boolean(),
});

const columns = [
  Prisma.EntiteScalarFieldEnum.nomComplet,
  Prisma.EntiteScalarFieldEnum.label,
  Prisma.EntiteScalarFieldEnum.email,
  Prisma.EntiteScalarFieldEnum.emailContactUsager,
  Prisma.EntiteScalarFieldEnum.telContactUsager,
  Prisma.EntiteScalarFieldEnum.adresseContactUsager,
] as const;

export const GetEntitiesQuerySchema = paginationQueryParamsSchema(columns);

export const GetEntitiesResponseSchema = z.array(EntiteSchema);

export const GetEntitesListAdminResponseSchema = z.array(
  z.object({
    id: z.string(),
    entiteNom: z.string(),
    entiteLabel: z.string(),
    directionNom: z.string(),
    directionLabel: z.string(),
    serviceNom: z.string(),
    serviceLabel: z.string(),
    email: z.string(),
    contactUsager: z.string(),
    isActiveLabel: z.enum(['Oui', 'Non']),
    editId: z.string(),
  }),
);

export const GetEntitesByIdAdminResponseSchema = EntiteAdminSchema;

export const EditEntiteInputSchema = EntiteAdminSchema.omit({ id: true });
export const EditEntiteAdminResponseSchema = EntiteAdminSchema;

export const GetEntitiesChainResponseSchema = z.array(
  EntiteSchema.pick({
    nomComplet: true,
    id: true,
  }).extend({
    disabled: z.boolean(),
  }),
);
