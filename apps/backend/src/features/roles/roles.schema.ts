import { RoleSchema } from '@/libs/zod';
import { z } from 'zod';
import 'zod-openapi/extend';

export const GetRolesResponseSchema = z.object({ role: RoleSchema });
