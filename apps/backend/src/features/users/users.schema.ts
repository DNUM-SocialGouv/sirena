import { RoleEnumSchema, UserSchema, z } from '@/libs/zod';

export const UserWithRoleSchema = UserSchema.extend({
  role: RoleEnumSchema,
});

export const GetUserResponseSchema = UserWithRoleSchema;
export const GetUsersResponseSchema = z.array(UserSchema);

export const UserParamsIdSchema = z.object({
  id: z.string(),
});

export const UserIdSchema = UserSchema.shape.id;
