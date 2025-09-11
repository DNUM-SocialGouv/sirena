import type { User } from '@/libs/prisma';
import type { z } from '@/libs/zod';
import type { GetUsersQuerySchema } from './users.schema';

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'roleId' | 'active' | 'statutId' | 'updatedAt'> & {
  statutId?: string;
};

export type PatchUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'pcData' | 'uid' | 'sub' | 'updatedAt'>>;

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
