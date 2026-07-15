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
  email: z.string(),
  emailContactUsager: z.string(),
  adresseContactUsager: z.string(),
  telContactUsager: z.string(),
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

export const GetEntitiesQuerySchema = paginationQueryParamsSchema(columns).extend({
  rootEntiteIds: z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .optional(),
});

const adminSortColumns = [
  'entiteNom',
  'entiteLabel',
  'directionNom',
  'directionLabel',
  'serviceNom',
  'serviceLabel',
  'email',
  'contactUsager',
  'isActiveLabel',
] as const;

export const GetEntitesListAdminQuerySchema = paginationQueryParamsSchema(adminSortColumns).extend({
  rootEntiteIds: z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .optional(),
});

export const GetEntitiesResponseSchema = z.array(EntiteSchema);

export const RootEntiteAdminSchema = z.object({
  id: z.string(),
  nomComplet: z.string(),
  label: z.string(),
});

export const GetRootEntitesListAdminResponseSchema = z.array(RootEntiteAdminSchema);

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

export const GetDirectionServiceAdminLocalResponseSchema = z.object({
  id: z.string(),
  kind: z.enum(['direction', 'service']),
  nomComplet: z.string(),
  label: z.string(),
  email: z.string(),
  isActive: z.boolean(),
});

export const GetDirectionsServicesListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      directionNom: z.string(),
      directionLabel: z.string(),
      serviceNom: z.string(),
      serviceLabel: z.string(),
      email: z.string(),
      editId: z.string(),
      canEdit: z.boolean(),
    }),
  ),
  capabilities: z.object({
    canCreateDirection: z.boolean(),
    canCreateService: z.boolean(),
  }),
});

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

export const CreateChildEntiteAdminInputSchema = z.object({
  nomComplet: z.string().trim().min(1),
  label: z.string().trim().min(1),
  email: z.string(),
  emailContactUsager: z.string(),
  adresseContactUsager: z.string(),
  telContactUsager: z.string(),
  isActive: z.boolean(),
});

export const EditDirectionServiceAdminLocalInputSchema = CreateChildEntiteAdminInputSchema.pick({
  nomComplet: true,
  label: true,
  email: true,
  isActive: true,
}).strict();

export const CreateChildEntiteAdminResponseSchema = CreateChildEntiteAdminInputSchema.extend({
  id: z.string(),
});

export const CreateDirectionAdminLocalInputSchema = CreateChildEntiteAdminInputSchema.extend({
  emailContactUsager: z.string().default(''),
  adresseContactUsager: z.string().default(''),
  telContactUsager: z.string().default(''),
});

export const CreateDirectionAdminLocalResponseSchema = CreateChildEntiteAdminResponseSchema;

export const CreateServiceAdminLocalInputSchema = EditDirectionServiceAdminLocalInputSchema.transform((data) => ({
  ...data,
  emailContactUsager: '',
  adresseContactUsager: '',
  telContactUsager: '',
}));

export const CreateServiceAdminLocalResponseSchema = CreateChildEntiteAdminResponseSchema;
