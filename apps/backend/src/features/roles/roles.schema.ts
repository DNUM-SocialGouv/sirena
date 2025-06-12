import { RoleSchema, z } from '@/libs/zod';

export const GetRolesResponseSchema = z.object({ data: RoleSchema });
