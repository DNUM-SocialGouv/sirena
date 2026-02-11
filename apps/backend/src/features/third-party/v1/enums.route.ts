import { openApiResponses } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import {
  GetAgeEnumsResponseSchema,
  GetCiviliteEnumsResponseSchema,
  GetLienVictimeEnumsResponseSchema,
} from './enums.schema.js';

export const getAgeEnumsRoute = describeRoute({
  description: 'Get all age enums',
  responses: {
    ...openApiResponses(GetAgeEnumsResponseSchema),
  },
});

export const getCiviliteEnumsRoute = describeRoute({
  description: 'Get all civilite enums',
  responses: {
    ...openApiResponses(GetCiviliteEnumsResponseSchema),
  },
});

export const getLienVictimeEnumsRoute = describeRoute({
  description: 'Get all lien victime enums',
  responses: {
    ...openApiResponses(GetLienVictimeEnumsResponseSchema),
  },
});
