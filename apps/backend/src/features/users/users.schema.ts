import { UserSchema } from '@sirena/database/zod';
import { z } from 'zod';
import 'zod-openapi/extend';

export const userSchema = z.object(UserSchema.shape);

export const getUserResponseSchema = z.object(UserSchema.shape);
export const getUsersResponseSchema = z.array(getUserResponseSchema);

export const userParamsIdSchema = z.object({
  id: z.string(),
});

export const createUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
});

export const deleteUserResponseSchema = z.object({
  message: z.string(),
});
