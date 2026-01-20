import type { z } from 'zod';
import type { User } from '../../libs/prisma.js';
import type { GetUsersQuerySchema } from './users.schema.js';

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'roleId' | 'statutId' | 'updatedAt'> & {
  statutId?: string;
};

export type PatchUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'pcData' | 'uid' | 'sub' | 'updatedAt'>>;

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
