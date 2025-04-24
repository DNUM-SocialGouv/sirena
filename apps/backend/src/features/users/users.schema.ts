import zod from '@sirena/database/zod';
import { z } from 'zod';
import 'zod-openapi/extend';

export const UserSchema = zod.UserSchema;

export const GetUserResponseSchema = UserSchema;
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

export const DeleteUserResponseSchema = z.object({
  message: z.string(),
});
