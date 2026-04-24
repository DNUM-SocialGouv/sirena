import {
  openApiDeleteResponse,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { FeatureFlagSchema, ResolvedFeatureFlagsSchema } from './featureFlags.schema.js';

export const getFeatureFlagsRoute = openApiProtectedRoute({
  description: 'Get all feature flags',
  responses: {
    ...openApiResponses(z.array(FeatureFlagSchema)),
  },
});

export const createFeatureFlagRoute = openApiProtectedRoute({
  description: 'Create a feature flag',
  responses: {
    ...openApiResponse(FeatureFlagSchema),
  },
});

export const patchFeatureFlagRoute = openApiProtectedRoute({
  description: 'Update a feature flag',
  responses: {
    ...openApiResponse(FeatureFlagSchema),
  },
});

export const deleteFeatureFlagRoute = openApiProtectedRoute({
  description: 'Delete a feature flag',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'Feature flag deleted successfully'),
  },
});

export const resolveFeatureFlagsRoute = openApiProtectedRoute({
  description: 'Resolve feature flags for the current user',
  responses: {
    ...openApiResponse(ResolvedFeatureFlagsSchema),
  },
});
