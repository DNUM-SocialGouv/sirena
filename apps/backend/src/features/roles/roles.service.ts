import { prisma, type RoleEnum } from '@/libs/prisma';

export const getRoles = async (): Promise<RoleEnum[]> => await prisma.roleEnum.findMany();
