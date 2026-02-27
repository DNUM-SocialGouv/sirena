import { z } from 'zod';

export const AgeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const CiviliteEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const LienVictimeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const MisEnCauseTypePrecisionEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const MisEnCauseTypeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const MotifDeclaratifEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const ConsequenceEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const MaltraitanceTypeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const AutoriteTypeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const DemarcheEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const LieuTypeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const GetMisEnCausePrecisionsTypeEnumsResponseSchema = z.array(MisEnCauseTypePrecisionEnumSchema);

export const GetAgeEnumsResponseSchema = z.array(AgeEnumSchema);

export const GetCiviliteEnumsResponseSchema = z.array(CiviliteEnumSchema);

export const GetLienVictimeEnumsResponseSchema = z.array(LienVictimeEnumSchema);

export const GetMisEnCauseTypeEnumsResponseSchema = z.object({
  profession: z.array(MisEnCauseTypeEnumSchema),
  professionDomicile: z.array(MisEnCauseTypeEnumSchema),
});

export const GetMotifDeclaratifEnumsResponseSchema = z.array(MotifDeclaratifEnumSchema);

export const GetConsequenceEnumsResponseSchema = z.array(ConsequenceEnumSchema);

export const GetMaltraitanceTypeEnumsResponseSchema = z.array(MaltraitanceTypeEnumSchema);

export const GetAutoriteTypeEnumsResponseSchema = z.array(AutoriteTypeEnumSchema);

export const GetDemarcheEnumsResponseSchema = z.array(DemarcheEnumSchema);

export const GetLieuTypeEnumsResponseSchema = z.array(LieuTypeEnumSchema);
