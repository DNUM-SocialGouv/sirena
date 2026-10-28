import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import {
  ExportRequetesResponseSchema,
  ExportRequetesStatusSchema,
  StatisticsDashboardPayloadSchema,
} from './statistics.schema.js';

export const getStatisticsDashboardRoute = openApiProtectedRoute({
  description:
    'Récupère les données de toutes les cartes du dashboard Metabase configuré (sans iframe), ' +
    'ainsi que ses onglets : chaque carte porte le tabId de son onglet (null si le dashboard n’en a pas) ' +
    'et filterSlugs, les slugs des filtres du dashboard câblés sur elle. ' +
    'Filtres optionnels en query string : startDate / endDate (dates ISO YYYY-MM-DD) pour borner la période, ' +
    'domaineIds (liste CSV de domaines fonctionnels) pour restreindre le périmètre métier, ' +
    "includeEIG=false pour retirer les requêtes signalées par un professionnel au titre d'un EIG.",
  tags: ['statistics'],
  responses: {
    ...openApiResponse(StatisticsDashboardPayloadSchema),
  },
});

export const postExportRequetesRoute = openApiProtectedRoute({
  description:
    "Lance la génération asynchrone de l'export CSV des requêtes du périmètre de l'utilisateur, " +
    'créées entre startDate et endDate (jours calendaires en heure de Paris, bornes incluses, 36 mois au plus). ' +
    "Répond 202 avec l'identifiant de l'export et l'adresse e-mail de l'utilisateur. " +
    'Erreurs métier (cause.code) : période invalide ou aucune requête sur la période (400), ' +
    'export déjà en cours pour cet utilisateur (409).',
  tags: ['statistics'],
  responses: {
    ...openApiResponse(ExportRequetesResponseSchema, 202, 'Export queued'),
  },
});

export const getExportRequetesStatusRoute = openApiProtectedRoute({
  description:
    "Indique si un export CSV des requêtes de l'utilisateur est en cours de génération : " +
    'le bouton « Générer l’export » reste désactivé tant que c’est le cas.',
  tags: ['statistics'],
  responses: {
    ...openApiResponse(ExportRequetesStatusSchema),
  },
});
