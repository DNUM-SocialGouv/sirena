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
  misEnCauseTypeId: z.string(),
});

export const MisEnCauseTypeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
  fields: z.array(z.string()).optional(),
  precisions: z.array(MisEnCauseTypePrecisionEnumSchema),
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

export const GetAgeEnumsResponseSchema = z.object({
  data: z.array(AgeEnumSchema),
});

export const GetCiviliteEnumsResponseSchema = z.object({
  data: z.array(CiviliteEnumSchema),
});

export const GetLienVictimeEnumsResponseSchema = z.object({
  data: z.array(LienVictimeEnumSchema),
});
export const GetMisEnCauseTypeEnumsResponseSchema = z.object({
  data: z.array(MisEnCauseTypeEnumSchema),
});

export const GetMotifDeclaratifEnumsResponseSchema = z.object({
  data: z.array(MotifDeclaratifEnumSchema),
});

export const GetConsequenceEnumsResponseSchema = z.object({
  data: z.array(ConsequenceEnumSchema),
});

export const GetMaltraitanceTypeEnumsResponseSchema = z.object({
  data: z.array(MaltraitanceTypeEnumSchema),
});
