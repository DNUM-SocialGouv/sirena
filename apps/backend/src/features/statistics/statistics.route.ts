import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { StatisticsDashboardPayloadSchema } from './statistics.schema.js';

export const getStatisticsDashboardRoute = openApiProtectedRoute({
  description:
    'Récupère les données de toutes les cartes du dashboard Metabase configuré (sans iframe). ' +
    'Filtres optionnels en query string : startDate / endDate (dates ISO YYYY-MM-DD) pour borner la période, ' +
    'domaineIds (liste CSV de domaines fonctionnels) pour restreindre le périmètre métier.',
  tags: ['statistics'],
  responses: {
    ...openApiResponse(StatisticsDashboardPayloadSchema),
  },
});

export const getExportRequetesRoute = openApiProtectedRoute({
  description: 'Exporte les requêtes SIRENA au format CSV',
  tags: ['statistics'],
  responses: {},
});
