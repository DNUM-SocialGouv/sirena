import { RoleEnumSchema } from '../roles/roles.schema';
import { UserSchema } from '../users/users.schema';

export const ProfileSchema = UserSchema.extend({
  role: RoleEnumSchema.nullable(),
}).omit({
  pcData: true,
});

export const GetProfileResponseSchema = ProfileSchema;
