import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { StatisticsCardDataSchema, StatisticsDashboardPayloadSchema } from './statistics.schema.js';

export const getStatisticsCardDataRoute = openApiProtectedRoute({
  description: "Récupère les données d'une question Metabase via embedding signé (sans iframe)",
  tags: ['statistics'],
  responses: {
    ...openApiResponse(StatisticsCardDataSchema),
  },
});

export const getStatisticsDashboardRoute = openApiProtectedRoute({
  description: 'Récupère les données de toutes les cartes du dashboard Metabase configuré (sans iframe)',
  tags: ['statistics'],
  responses: {
    ...openApiResponse(StatisticsDashboardPayloadSchema),
  },
});
