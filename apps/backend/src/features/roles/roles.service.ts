import { prisma, type RoleEnum } from '../../libs/prisma.js';

export const getRoles = async (): Promise<RoleEnum[]> => await prisma.roleEnum.findMany();
