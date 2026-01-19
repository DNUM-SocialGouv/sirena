import { RoleEnumSchema } from '../roles/roles.schema.js';
import { UserSchema } from '../users/users.schema.js';

export const ProfileSchema = UserSchema.extend({
  role: RoleEnumSchema.nullable(),
}).omit({
  pcData: true,
});

export const GetProfileResponseSchema = ProfileSchema;
