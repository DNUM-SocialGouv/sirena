import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { StatisticsDashboardPayloadSchema } from './statistics.schema.js';

export const getStatisticsDashboardRoute = openApiProtectedRoute({
  description: 'Récupère les données de toutes les cartes du dashboard Metabase configuré (sans iframe)',
  tags: ['statistics'],
  responses: {
    ...openApiResponse(StatisticsDashboardPayloadSchema),
  },
});
