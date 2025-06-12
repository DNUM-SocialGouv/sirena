import logger from '@/libs/pino';
import { parseData } from '@/libs/zod';
import {
  AUTHORITIES,
  HOME_SERVICES,
  NATURE_LIEU,
  PROFESSIONNEL_MIS_EN_CAUSE,
  TYPE_DE_FAITS,
  TYPE_DE_MIS_EN_CAUSE,
} from './dematSocial.constants';
import { ReturnOpenDataSoftSchema } from './dematSocial.shema';
import type { Authorities, Reclamation, ServiceADomicile } from './dematSocial.type';

import { envVars } from '@/config/env';
import { comparWithoutCase } from './dematSocial.helpers';

const getAuthoritiesByServiceType = (serviceADomicile: ServiceADomicile): Authorities[] => {
  const service = HOME_SERVICES.find((s) => s.value === serviceADomicile);
  if (service) {
    return [service.assignation];
  }
  return [];
};

// If the reclamation is at home
const getAuthoritiesByHome = (reclamation: Reclamation): Authorities[] => {
  if (!comparWithoutCase(reclamation.misEnCause.typeDeMisEnCause, TYPE_DE_MIS_EN_CAUSE.PROFESSIONNEL)) {
    return [AUTHORITIES.CD];
  }
  if (reclamation.lieuSurvenue.domicile?.serviceADomicile) {
    return getAuthoritiesByServiceType(reclamation.lieuSurvenue.domicile.serviceADomicile);
  }
  return [];
};

// used by getAuthoritiesByHome. If the reclamation is not at home and the implicated is a professional or family member / someone close
const getAuthoritiesByImplicated = (reclamation: Reclamation): Authorities[] => {
  if (
    comparWithoutCase(reclamation.misEnCause.typeDeMisEnCause, TYPE_DE_MIS_EN_CAUSE.MEMBRE_FAMILLE) ||
    comparWithoutCase(reclamation.misEnCause.typeDeMisEnCause, TYPE_DE_MIS_EN_CAUSE.PROCHE)
  ) {
    return [AUTHORITIES.CD];
  }
  if (comparWithoutCase(reclamation.misEnCause.typeDeMisEnCause, TYPE_DE_MIS_EN_CAUSE.PROFESSIONNEL)) {
    if (
      comparWithoutCase(
        reclamation.lieuSurvenue.cabinetMedical?.typeDeMisEnCause ?? '',
        PROFESSIONNEL_MIS_EN_CAUSE.PROF_SANTE,
      ) ||
      comparWithoutCase(reclamation.lieuSurvenue.trajet?.typeDeMisEnCause ?? '', PROFESSIONNEL_MIS_EN_CAUSE.PROF_SANTE)
    ) {
      return [AUTHORITIES.ARS];
    }
    if (
      comparWithoutCase(
        reclamation.lieuSurvenue.cabinetMedical?.typeDeMisEnCause ?? '',
        PROFESSIONNEL_MIS_EN_CAUSE.MJPM,
      ) ||
      comparWithoutCase(reclamation.lieuSurvenue.trajet?.typeDeMisEnCause ?? '', PROFESSIONNEL_MIS_EN_CAUSE.MJPM)
    ) {
      return [AUTHORITIES.DDETS];
    }
  }
  return [];
};

// If the reclamation is not at home, check for the place and the type
const getAuthoritiesByPlace = async (
  reclamation: Reclamation,
): Promise<{ authorities: Authorities[]; force?: boolean }> => {
  if (
    !comparWithoutCase(reclamation.lieuSurvenue.natureLieu, NATURE_LIEU.ETABLISSEMENT_HEBERGEMENT) &&
    !comparWithoutCase(reclamation.lieuSurvenue.natureLieu, NATURE_LIEU.ETABLISSEMENT_SERVICE_SOCIAL)
  ) {
    return { authorities: [AUTHORITIES.ARS] };
  }
  if (
    reclamation.description.typesDeFaits.some(
      (type) =>
        comparWithoutCase(type, TYPE_DE_FAITS.DIFFICULTES_ACCES_SOINS) ||
        comparWithoutCase(type, TYPE_DE_FAITS.PROBLEME_QUALITE_SOINS),
    )
  ) {
    return { authorities: [AUTHORITIES.ARS], force: true };
  }
  const finess = reclamation.lieuSurvenue.etablissementSanitaireEtSocial?.et_finess;
  if (!finess) {
    return { authorities: [] };
  }
  const authorities = await getAuthoritiesByFINESS(finess);
  return { authorities, force: false };
};

const tutelleToAuthority = (tutelle: string | null): Authorities[] =>
  tutelle ? Object.values(AUTHORITIES).filter((value) => tutelle?.includes(value)) : [];

export const getAuthoritiesByFINESS = async (finess: string): Promise<Authorities[]> => {
  const baseUrl = `${envVars.OPENDATASOFT_URI}/t_finess/records`;
  const paranms = {
    select: 'tutelle,finess',
    refine: `finess:${finess}`,
  };

  const url = new URL(baseUrl);

  Object.entries(paranms).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Error fetching FINESS data: ${response.statusText}`, { cause: { url: url.toString() } });
    }
    const data = await response.json();
    const parsedData = parseData(data, ReturnOpenDataSoftSchema);
    if (parsedData.results.length === 0) {
      throw new Error('No results found for the provided FINESS code', { cause: { url: url.toString() } });
    }
    const result = data.results[0];

    return tutelleToAuthority(result.tutelle);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching authorities by FINESS');
    return [];
  }
};

export const getCompetentAuthorities = async (reclamation: Reclamation): Promise<Set<Authorities>> => {
  if (reclamation.lieuSurvenue.natureLieu === NATURE_LIEU.DOMICILE) {
    const authorities = getAuthoritiesByHome(reclamation);
    return new Set(authorities);
  }
  const authoritiesByPlace = await getAuthoritiesByPlace(reclamation);
  if (authoritiesByPlace.force) {
    return new Set(authoritiesByPlace.authorities);
  }
  const authoritiesByImplicated = getAuthoritiesByImplicated(reclamation);
  const authorities = new Set([...authoritiesByImplicated, ...authoritiesByPlace.authorities]);
  if (authorities.size === 0) {
    throw new Error(`No authorities found for the given reclamation ${reclamation.id}`, {
      cause: { reclamation },
    });
  }
  return authorities;
};
