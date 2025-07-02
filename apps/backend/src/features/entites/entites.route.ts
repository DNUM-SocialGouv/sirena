import {
  openApi401Unauthorized,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { GetEntitiesChainResponseSchema, GetEntitiesResponseSchema } from './entites.schema';

export const getEntitesRoute = openApiProtectedRoute({
  description: 'Get entites',
  responses: {
    ...openApiResponses(GetEntitiesResponseSchema),
  },
});

// openApiProtectedRoute not working for openApiResponse duno why
// export const getEntiteChainRoute = openApiProtectedRoute({
//   description: 'Get entity chain',
//   responses: {
//     ...openApiResponse(GetEntitiesChainResponseSchema),
//   },
// });

export const getEntiteChainRoute = describeRoute({
  description: 'Get entity chain',
  responses: {
    ...openApi401Unauthorized('Unauthorized'),
    ...openApiResponse(GetEntitiesChainResponseSchema),
  },
});
