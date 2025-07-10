import {
  openApi404NotFound,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { GetDematSocialMapping, GetDematSocialMappings } from './dematSocialMapping.schema';

export const getDematSocialMappingRoute = openApiProtectedRoute({
  description: 'Get dematSocialMapping by id',
  responses: {
    ...openApiResponse(GetDematSocialMapping),
    ...openApi404NotFound('User not found'),
  },
});

export const getDematSocialMappingsRoute = openApiProtectedRoute({
  description: 'Get all dematSocialMappings',
  responses: {
    ...openApiResponses(GetDematSocialMappings),
  },
});

export const patchDematSocialMappingRoute = openApiProtectedRoute({
  description: 'Patch dematSocialMapping by id',
  responses: {
    ...openApiResponse(GetDematSocialMapping),
    ...openApi404NotFound('User not found'),
  },
});
