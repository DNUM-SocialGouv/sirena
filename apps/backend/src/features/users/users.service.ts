import prisma from '@/libs/prisma.ts';
import type { CreateUserDto } from '@/types/user.d.ts';
import type { User } from '@sirena/database';

export const getUsers = async (): Promise<User[]> => await prisma.user.findMany();

export const getUserById = async (id: User['id']): Promise<User | null> =>
  await prisma.user.findUnique({ where: { id } });
export const getUserBySub = async (sub: User['sub']) => await prisma.user.findUnique({ where: { sub } });

export const createUser = async (newUser: CreateUserDto) =>
  await prisma.user.create({
    data: {
      ...newUser,
    },
  });

export const deleteUser = async (id: User['id']) => await prisma.user.delete({ where: { id } });
