import {
  type DsMotif,
  type LieuType,
  MALTRAITANCE_TYPE,
  type MisEnCauseType,
  type MisEnCauseTypePrecisionUnion,
} from '@sirena/common/constants';
import type { Prisma } from '../../../../generated/client';
import type { SituationContext } from './types';
import { extractFinessFromRawText, extractPostalCode } from './utils';

type RequeteWithSituations = Prisma.RequeteGetPayload<{
  include: {
    situations: {
      include: {
        lieuDeSurvenue: {
          include: { adresse: true };
        };
        misEnCause: {
          include: {
            misEnCauseType: true;
            misEnCauseTypePrecision: true;
          };
        };
        faits: {
          include: {
            motifsDeclaratifs: {
              include: {
                motifDeclaratif: true;
              };
            };
            motifs: {
              include: {
                motif: true;
              };
            };
            maltraitanceTypes: {
              include: {
                maltraitanceType: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type SituationWithLieu = RequeteWithSituations['situations'][number];

export function buildSituationContextFromDemat(situation: SituationWithLieu): SituationContext {
  const ctx: SituationContext = {};
  const lds = situation?.lieuDeSurvenue;

  ctx.lieuType = lds?.lieuTypeId as LieuType;

  ctx.finessCode = extractFinessFromRawText(lds?.finess) ?? null;

  ctx.postalCode =
    extractPostalCode(lds?.adresse?.codePostal ?? null) ?? extractPostalCode(lds?.adresse?.label ?? null);

  ctx.misEnCauseType = situation?.misEnCause?.misEnCauseType?.id as MisEnCauseType;

  ctx.misEnCauseTypePrecision = situation?.misEnCause?.misEnCauseTypePrecision?.id as MisEnCauseTypePrecisionUnion;

  // YES = One of the following answers is selected:
  // - "NEGLIGENCES"
  // - "VIOLENCES""
  // - "MATERIELLE_FINANCIERE"
  // - "SEXUELLE"
  const faits = situation?.faits || [];
  const positiveMaltraitanceTypes = [
    MALTRAITANCE_TYPE.NEGLIGENCES,
    MALTRAITANCE_TYPE.VIOLENCES,
    MALTRAITANCE_TYPE.MATERIELLE_FINANCIERE,
    MALTRAITANCE_TYPE.SEXUELLE,
  ] as const;
  ctx.isMaltraitance = faits.some((fait) => {
    const maltraitanceTypes = fait?.maltraitanceTypes || [];
    return maltraitanceTypes.some((type) =>
      positiveMaltraitanceTypes.includes(type?.maltraitanceType?.id as (typeof positiveMaltraitanceTypes)[number]),
    );
  });

  ctx.motifsDeclaratifs =
    situation?.faits?.flatMap((fait) =>
      fait?.motifsDeclaratifs?.map((motif) => motif?.motifDeclaratif?.id as DsMotif),
    ) ?? [];

  return ctx;
}
