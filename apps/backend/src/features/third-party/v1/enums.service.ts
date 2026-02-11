import {
  type AgeEnum,
  type CiviliteEnum,
  type MisEnCauseTypeEnum,
  type MisEnCauseTypePrecisionEnum,
  type LienVictimeEnum,
  prisma,
} from '../../../libs/prisma.js';

const FIELD_MAPPINGS: Record<string, string[]> = {
  PROFESSIONNEL_SANTE: ['rpps', 'commentaire'],
  MEMBRE_FAMILLE: ['commentaire'],
};

export const getAgeEnums = async (): Promise<AgeEnum[]> => await prisma.ageEnum.findMany();

export const getCiviliteEnums = async (): Promise<CiviliteEnum[]> => await prisma.civiliteEnum.findMany();

export const getLienVictimeEnums = async (): Promise<LienVictimeEnum[]> => await prisma.lienVictimeEnum.findMany();

export const getMisEnCauseTypeEnums = async (): Promise<
  (MisEnCauseTypeEnum & { precisions: MisEnCauseTypePrecisionEnum[]; fields?: string[] })[]
> => {
  const enums = await prisma.misEnCauseTypeEnum.findMany({
    include: {
      precisions: true,
    },
  });

  return enums.map((enumItem) => ({
    ...enumItem,
    fields: FIELD_MAPPINGS[enumItem.id],
  }));
};
