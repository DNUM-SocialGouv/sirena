import { RoleEnumSchema, UserSchema, z } from '@/libs/zod';

export const ProfileSchema = UserSchema.extend({
  role: RoleEnumSchema.nullable(),
});

export const GetProfileResponseSchema = ProfileSchema;
