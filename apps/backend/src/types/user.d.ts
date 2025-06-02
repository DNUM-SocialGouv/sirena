import type { User } from '@/libs/prisma';

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'role'>;
