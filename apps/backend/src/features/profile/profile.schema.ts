import { RoleEnumSchema, UserSchema, z } from '@/libs/zod';

export const ProfileSchema = UserSchema.extend({
  role: RoleEnumSchema.nullable(),
}).omit({
  pcData: true,
});

export const GetProfileResponseSchema = ProfileSchema;
