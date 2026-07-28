import {
  dsLieuTypeLabels,
  dsMisEnCauseTypeLabels,
  dsProfessionDomicileTypeLabels,
  dsProfessionTypeLabels,
  SIREC_ONLY_MOTIF_DECLARATIF_IDS,
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

// SIREC-only motifs are excluded: they are not accepted by the third-party FaitSchema, so the
// enum endpoint must not advertise values a third party would then be rejected for submitting.
export const getMotifDeclaratifEnums = async () =>
  await prisma.motifDeclaratifEnum.findMany({ where: { id: { notIn: SIREC_ONLY_MOTIF_DECLARATIF_IDS } } });

export const getConsequenceEnums = async () => await prisma.consequenceEnum.findMany();

export const getMaltraitanceTypeEnums = async () => await prisma.maltraitanceTypeEnum.findMany();
