import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { Prisma } from '@/libs/prisma';
import { RoleEnumSchema, UserSchema, z } from '@/libs/zod';

export const UserWithRoleSchema = UserSchema.extend({
  role: RoleEnumSchema,
});
// DEVNOTE: known issue on zod-openapi https://github.com/samchungy/zod-openapi/issues/457
export const GetUserResponseSchema = UserWithRoleSchema.omit({
  pcData: true,
});
export const GetUsersResponseSchema = z.array(
  UserWithRoleSchema.omit({
    pcData: true,
  }),
);

export const UserParamsIdSchema = z.object({
  id: z.string(),
});

export const UserIdSchema = UserSchema.shape.id;

const columns = [
  Prisma.UserScalarFieldEnum.email,
  Prisma.UserScalarFieldEnum.prenom,
  Prisma.UserScalarFieldEnum.nom,
] as const;

export const GetUsersQuerySchema = paginationQueryParamsSchema(columns).extend({
  roleId: z
    .string()
    .transform((val) => val.split(',').map((id) => id.trim()))
    .optional(),
  active: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export const PatchUserSchema = UserSchema.pick({
  entiteId: true,
  roleId: true,
  statutId: true,
}).partial();
