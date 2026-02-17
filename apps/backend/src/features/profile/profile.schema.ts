import { z } from 'zod';
import { RoleEnumSchema } from '../roles/roles.schema.js';
import { UserSchema } from '../users/users.schema.js';

const AffectationChainItemSchema = z.object({
  id: z.string(),
  nomComplet: z.string(),
});

export const ProfileSchema = UserSchema.extend({
  role: RoleEnumSchema.nullable(),
  topEntiteId: z.string().nullable(),
  topEntiteIsActive: z.boolean().nullable(),
  entiteIds: z.array(z.string()),
  affectationChain: z.array(AffectationChainItemSchema),
}).omit({
  pcData: true,
});

export const GetProfileResponseSchema = ProfileSchema;
