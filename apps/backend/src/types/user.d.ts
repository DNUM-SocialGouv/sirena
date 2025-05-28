import type { User } from '@/libs/prisma.ts';

export type CreateUserDto = Omit<User, 'id' | 'createdAt'>;
