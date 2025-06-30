import type { User } from '@/libs/prisma';

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'roleId' | 'active' | 'statutId'> & {
  statutId?: string;
};

export type PatchUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'pcData' | 'uid' | 'sub'>>;
