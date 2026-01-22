import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { z } from 'zod';
import { Prisma } from '../../libs/prisma.js';
import { RoleEnumSchema } from '../roles/roles.schema.js';

export const UserSchema = z.object({
  id: z.cuid(),
  email: z.email({ message: 'Invalid email address' }),
  prenom: z.string(),
  nom: z.string(),
  uid: z.string(),
  sub: z.string(),
  pcData: z.record(z.string(), z.string()),
  roleId: z.string(),
  statutId: z.string(),
  entiteId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UserWithRoleSchema = UserSchema.extend({
  role: RoleEnumSchema,
});
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
  statutId: z
    .string()
    .transform((val) => val.split(',').map((id) => id.trim()))
    .optional(),
});

export const PatchUserSchema = UserSchema.pick({
  entiteId: true,
  roleId: true,
  statutId: true,
}).partial();
