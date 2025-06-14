import { RoleSchema, UserSchema, z } from '@/libs/zod';

export const UserWithRoleSchema = UserSchema.extend({
  role: RoleSchema.nullable(),
});

export const GetUserResponseSchema = UserWithRoleSchema;
export const GetUsersResponseSchema = z.array(UserSchema);

export const UserParamsIdSchema = z.object({
  id: z.string(),
});

export const PostUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
});

export const UserIdSchema = UserSchema.shape.id;
