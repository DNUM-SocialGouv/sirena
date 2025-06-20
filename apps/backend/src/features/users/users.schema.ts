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
