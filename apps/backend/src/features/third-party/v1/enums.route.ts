import { openApiResponses } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import {
  GetAgeEnumsResponseSchema,
  GetCiviliteEnumsResponseSchema,
  GetConsequenceEnumsResponseSchema,
  GetLienVictimeEnumsResponseSchema,
  GetMaltraitanceTypeEnumsResponseSchema,
  GetMisEnCauseTypeEnumsResponseSchema,
  GetMotifDeclaratifEnumsResponseSchema,
} from './enums.schema.js';

export const getAgeEnumsRoute = describeRoute({
  description: 'Get all age enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetAgeEnumsResponseSchema),
  },
});

export const getCiviliteEnumsRoute = describeRoute({
  description: 'Get all civilite enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetCiviliteEnumsResponseSchema),
  },
});

export const getLienVictimeEnumsRoute = describeRoute({
  description: 'Get all lien victime enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetLienVictimeEnumsResponseSchema),
  },
});

export const getMisEnCauseTypeEnumsRoute = describeRoute({
  description: 'Get all mis en cause type enums with their precisions and field metadata',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetMisEnCauseTypeEnumsResponseSchema),
  },
});

export const getMotifDeclaratifEnumsRoute = describeRoute({
  description: 'Get all motif declaratif enums (motifs as used in DematSocial declarations)',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetMotifDeclaratifEnumsResponseSchema),
  },
});

export const getConsequenceEnumsRoute = describeRoute({
  description: 'Get all consequence enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetConsequenceEnumsResponseSchema),
  },
});

export const getMaltraitanceTypeEnumsRoute = describeRoute({
  description: 'Get all maltraitance type enums',
  tags: ['Third-Party', 'Enums'],
  responses: {
    ...openApiResponses(GetMaltraitanceTypeEnumsResponseSchema),
  },
});
