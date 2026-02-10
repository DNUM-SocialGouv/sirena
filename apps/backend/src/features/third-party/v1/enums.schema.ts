import { z } from 'zod';

export const AgeEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const CiviliteEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const LieuDeSurvenuePrecisionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const LieuDeSurvenueEnumSchema = z.object({
  id: z.string(),
  label: z.string(),
  fields: z.array(z.string()).optional(),
  precisions: z.array(LieuDeSurvenuePrecisionSchema),
});

export const GetAgeEnumsResponseSchema = z.object({
  data: z.array(AgeEnumSchema),
});

export const GetCiviliteEnumsResponseSchema = z.object({
  data: z.array(CiviliteEnumSchema),
});

export const GetLieuDeSurvenueEnumsResponseSchema = z.object({
  data: z.array(LieuDeSurvenueEnumSchema),
});
