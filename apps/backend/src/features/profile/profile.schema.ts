import { z } from 'zod';
import { RoleEnumSchema } from '../roles/roles.schema.js';
import { UserSchema } from '../users/users.schema.js';

export const ProfileSchema = UserSchema.extend({
  role: RoleEnumSchema.nullable(),
  topEntiteId: z.string().nullable(),
  entiteIds: z.array(z.string()),
}).omit({
  pcData: true,
});

export const GetProfileResponseSchema = ProfileSchema;
