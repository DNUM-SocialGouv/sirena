import {
  dsLieuTypeLabels,
  dsMisEnCauseTypeLabels,
  dsProfessionDomicileTypeLabels,
  dsProfessionTypeLabels,
} from '@sirena/common/constants';
import { prisma } from '../../../libs/prisma.js';

export const getAgeEnums = async () => await prisma.ageEnum.findMany();

export const getLieuTypeEnums = () => Object.entries(dsLieuTypeLabels).map(([key, value]) => ({ key, value }));

export const getDemarcheEnums = async () => await prisma.demarchesEngageesEnum.findMany();

export const getAutoriteTypeEnums = async () => await prisma.autoriteTypeEnum.findMany();

export const getCiviliteEnums = async () => await prisma.civiliteEnum.findMany();

export const getLienVictimeEnums = async () => await prisma.lienVictimeEnum.findMany();

export const getMisEnCauseTypeEnums = () =>
  Object.entries(dsMisEnCauseTypeLabels).map(([key, value]) => ({ key, value }));

export const getMisEnCausePrecisionsTypeEnums = () => ({
  profession: Object.entries(dsProfessionTypeLabels).map(([key, value]) => ({ key, value })),
  professionDomicile: Object.entries(dsProfessionDomicileTypeLabels).map(([key, value]) => ({ key, value })),
});

export const getMotifDeclaratifEnums = async () => await prisma.motifDeclaratifEnum.findMany();

export const getConsequenceEnums = async () => await prisma.consequenceEnum.findMany();

export const getMaltraitanceTypeEnums = async () => await prisma.maltraitanceTypeEnum.findMany();
