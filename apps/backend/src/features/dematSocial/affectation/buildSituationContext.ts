import type { LieuType, MisEnCauseType, MisEnCauseTypePrecisionUnion, Motif } from '@sirena/common/constants';
import type { Prisma } from '../../../../generated/client';
import type { SituationContext } from './types';
import { extractFinessFromRawText, extractPostalCode, extractProfessionDomicileTypeFromRawText } from './utils';

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

  ctx.professionDomicileType = extractProfessionDomicileTypeFromRawText(
    situation?.misEnCause?.misEnCauseTypePrecision?.id,
  );

  ctx.misEnCauseTypePrecision = situation?.misEnCause?.misEnCauseTypePrecision?.id as MisEnCauseTypePrecisionUnion;

  // Check if at least one "fait" has a "yes" answer to the "maltraitance" question
  // (exclude "NON" and "NE_SAIS_PAS" which are negative answers)
  const faits = situation?.faits || [];
  ctx.isMaltraitance = faits.some((fait) => {
    const maltraitanceTypes = fait?.maltraitanceTypes || [];
    return (
      maltraitanceTypes.length > 0 &&
      maltraitanceTypes.some(
        (type) => type?.maltraitanceType?.id !== 'NON' && type?.maltraitanceType?.id !== 'NE_SAIS_PAS',
      )
    );
  });

  ctx.motifsDeclaratifs =
    situation?.faits?.flatMap((fait) => fait?.motifsDeclaratifs?.map((motif) => motif?.motifDeclaratif?.id as Motif)) ??
    [];

  ctx.motifs =
    situation?.faits?.flatMap((fait) => fait?.motifs?.map((motif) => motif?.motif?.id as Motif | string)) ?? [];

  return ctx;
}
