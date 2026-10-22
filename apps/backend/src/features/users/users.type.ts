import type { z } from 'zod';
import type { User } from '../../libs/prisma.js';
import type { GetUsersQuerySchema } from './users.schema.js';

export type CreateUserDto = Omit<
  User,
  'id' | 'createdAt' | 'roleId' | 'statutId' | 'updatedAt' | 'cguAcceptedVersion' | 'cguAcceptedAt'
> & {
  statutId?: string;
};

// The CGU acceptance is recorded by the user themself only, never through an admin update
export type PatchUserDto = Partial<
  Omit<User, 'id' | 'createdAt' | 'pcData' | 'uid' | 'sub' | 'updatedAt' | 'cguAcceptedVersion' | 'cguAcceptedAt'>
>;

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
