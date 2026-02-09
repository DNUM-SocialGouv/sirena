import { openApiResponses } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { GetAgeEnumsResponseSchema, GetCiviliteEnumsResponseSchema } from './enums.schema.js';

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
