import { z } from 'zod';

export const RoleEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const GetRolesResponseSchema = RoleEnumSchema;
