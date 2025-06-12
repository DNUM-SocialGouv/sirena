import { type Role, prisma } from '@/libs/prisma';

export const getRoles = async (): Promise<Role[]> => await prisma.role.findMany();
