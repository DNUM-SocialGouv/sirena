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

export const GetAgeEnumsResponseSchema = z.object({
  data: z.array(AgeEnumSchema),
});

export const GetCiviliteEnumsResponseSchema = z.object({
  data: z.array(CiviliteEnumSchema),
});

export const GetLienVictimeEnumsResponseSchema = z.object({
  data: z.array(LienVictimeEnumSchema),
});
