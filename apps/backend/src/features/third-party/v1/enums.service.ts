import { type AgeEnum, type CiviliteEnum, type LienVictimeEnum, prisma } from '../../../libs/prisma.js';

export const getAgeEnums = async (): Promise<AgeEnum[]> => await prisma.ageEnum.findMany();

export const getCiviliteEnums = async (): Promise<CiviliteEnum[]> => await prisma.civiliteEnum.findMany();

export const getLienVictimeEnums = async (): Promise<LienVictimeEnum[]> => await prisma.lienVictimeEnum.findMany();
