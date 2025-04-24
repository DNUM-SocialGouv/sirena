import { z } from '@hono/zod-openapi';
import zod from '@sirena/database/zod';

const UserSchema = zod.UserSchema;

export const getUserResponseSchema = UserSchema;
export const getUsersResponseSchema = z.array(UserSchema);

export const userParamsIdSchema = z.object({
  id: z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
  }),
});

export const postUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
});

export const postUserResponseSchema = UserSchema;

export const deleteUserResponseSchema = z.object({
  message: z.string(),
});
