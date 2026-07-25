import { openApiProtectedRoute, openApiResponses } from '@sirena/backend-utils/helpers';
import { GetAddressesResponseSchema } from './adresse.schema.js';

export const getAddressesRoute = openApiProtectedRoute({
  description: 'Search addresses using the BAN (Base Adresse Nationale)',
  responses: {
    ...openApiResponses(GetAddressesResponseSchema),
  },
});
