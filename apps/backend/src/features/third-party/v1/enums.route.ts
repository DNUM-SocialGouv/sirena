import { describeRoute, resolver } from 'hono-openapi';
import type { ZodSchema } from 'zod';
import {
  GetAgeEnumsResponseSchema,
  GetAutoriteTypeEnumsResponseSchema,
  GetCiviliteEnumsResponseSchema,
  GetConsequenceEnumsResponseSchema,
  GetDemarcheEnumsResponseSchema,
  GetLienVictimeEnumsResponseSchema,
  GetLieuTypeEnumsResponseSchema,
  GetMaltraitanceTypeEnumsResponseSchema,
  GetMisEnCauseTypeEnumsResponseSchema,
  GetMotifDeclaratifEnumsResponseSchema,
} from './enums.schema.js';

const openApiRawResponse = <T extends ZodSchema>(schema: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: resolver(schema) },
    },
  },
});

export const getAgeEnumsRoute = describeRoute({
  description: 'Get all age enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetAgeEnumsResponseSchema),
  },
});

export const getCiviliteEnumsRoute = describeRoute({
  description: 'Get all civilite enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetCiviliteEnumsResponseSchema),
  },
});

export const getLienVictimeEnumsRoute = describeRoute({
  description: 'Get all lien victime enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetLienVictimeEnumsResponseSchema),
  },
});

export const getMisEnCauseTypeEnumsRoute = describeRoute({
  description: 'Get all mis en cause type enums with their precisions and field metadata',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetMisEnCauseTypeEnumsResponseSchema),
  },
});

export const getMotifDeclaratifEnumsRoute = describeRoute({
  description: 'Get all motif declaratif enums (motifs as used in DematSocial declarations)',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetMotifDeclaratifEnumsResponseSchema),
  },
});

export const getConsequenceEnumsRoute = describeRoute({
  description: 'Get all consequence enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetConsequenceEnumsResponseSchema),
  },
});

export const getAutoriteTypeEnumsRoute = describeRoute({
  description: 'Get all autorite type enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetAutoriteTypeEnumsResponseSchema),
  },
});

export const getDemarcheEnumsRoute = describeRoute({
  description: 'Get all demarche enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetDemarcheEnumsResponseSchema),
  },
});

export const getLieuTypeEnumsRoute = describeRoute({
  description: 'Get all lieu type enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetLieuTypeEnumsResponseSchema),
  },
});

export const getMaltraitanceTypeEnumsRoute = describeRoute({
  description: 'Get all maltraitance type enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiRawResponse(GetMaltraitanceTypeEnumsResponseSchema),
  },
});
