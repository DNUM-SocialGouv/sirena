import {
  LIEU_AUTRES_ETABLISSEMENTS_PRECISION,
  LIEU_DOMICILE_PRECISION,
  LIEU_ETABLISSEMENT_HANDICAP_PRECISION,
  LIEU_ETABLISSEMENT_PERSONNES_AGEES_PRECISION,
  LIEU_ETABLISSEMENT_SANTE_PRECISION,
  LIEU_ETABLISSEMENT_SOCIAL_PRECISION,
  LIEU_TRAJET_PRECISION,
  lieuAutresEtablissementsPrecisionLabels,
  lieuDomicilePrecisionLabels,
  lieuEtablissementHandicapPrecisionLabels,
  lieuEtablissementPersonnesAgeesPrecisionLabels,
  lieuEtablissementSantePrecisionLabels,
  lieuEtablissementSocialPrecisionLabels,
  lieuTrajetPrecisionLabels,
} from '@sirena/common/constants';
import { type AgeEnum, type CiviliteEnum, type LieuTypeEnum, prisma } from '../../../libs/prisma.js';

type LieuPrecision = {
  id: string;
  label: string;
};

type LieuTypeEnumWithPrecisions = LieuTypeEnum & {
  precisions: LieuPrecision[];
  fields?: string[];
};

// Define which fields should be shown for each lieu type
const FIELD_MAPPINGS: Record<string, string[]> = {
  DOMICILE: ['lieuPrecision', 'adresse', 'codePostal', 'ville'],
  ETABLISSEMENT_SANTE: ['lieuPrecision', 'finess', 'adresse', 'codePostal', 'ville'],
  ETABLISSEMENT_PERSONNES_AGEES: ['lieuPrecision', 'finess', 'adresse', 'codePostal', 'ville'],
  ETABLISSEMENT_HANDICAP: ['lieuPrecision', 'finess', 'adresse', 'codePostal', 'ville'],
  ETABLISSEMENT_SOCIAL: ['lieuPrecision', 'finess', 'adresse', 'codePostal', 'ville'],
  AUTRES_ETABLISSEMENTS: ['lieuPrecision', 'adresse', 'codePostal', 'ville'],
  TRAJET: ['lieuPrecision', 'societeTransport', 'codePostal'],
};

// Define précisions for each lieu type
const PRECISIONS_MAPPINGS: Record<string, Record<string, string>> = {
  DOMICILE: lieuDomicilePrecisionLabels,
  ETABLISSEMENT_SANTE: lieuEtablissementSantePrecisionLabels,
  ETABLISSEMENT_PERSONNES_AGEES: lieuEtablissementPersonnesAgeesPrecisionLabels,
  ETABLISSEMENT_HANDICAP: lieuEtablissementHandicapPrecisionLabels,
  ETABLISSEMENT_SOCIAL: lieuEtablissementSocialPrecisionLabels,
  AUTRES_ETABLISSEMENTS: lieuAutresEtablissementsPrecisionLabels,
  TRAJET: lieuTrajetPrecisionLabels,
};

export const getAgeEnums = async (): Promise<AgeEnum[]> => await prisma.ageEnum.findMany();

export const getCiviliteEnums = async (): Promise<CiviliteEnum[]> => await prisma.civiliteEnum.findMany();

export const getLieuDeSurvenueEnums = async (): Promise<LieuTypeEnumWithPrecisions[]> => {
  const enums = await prisma.lieuTypeEnum.findMany();

  return enums.map((enumItem) => {
    const precisionsLabels = PRECISIONS_MAPPINGS[enumItem.id] || {};
    const precisions: LieuPrecision[] = Object.entries(precisionsLabels).map(([id, label]) => ({
      id,
      label,
    }));

    return {
      ...enumItem,
      precisions,
      fields: FIELD_MAPPINGS[enumItem.id],
    };
  });
};
