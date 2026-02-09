import { type AgeEnum, type CiviliteEnum, prisma } from '../../../libs/prisma.js';

export const getAgeEnums = async (): Promise<AgeEnum[]> => await prisma.ageEnum.findMany();

export const getCiviliteEnums = async (): Promise<CiviliteEnum[]> => await prisma.civiliteEnum.findMany();
