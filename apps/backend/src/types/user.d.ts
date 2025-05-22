import type { User } from '@sirena/database';

export type CreateUserDto = Omit<User, 'id' | 'createdAt'>;
