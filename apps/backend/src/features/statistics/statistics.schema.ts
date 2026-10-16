import { DOMAINES_FONCTIONNELS, FILTRE_NON_RENSEIGNE, LIEU_TYPE } from '@sirena/common/constants';
import { estNonRenseigne, lieuPrecisionLabelsByType } from '@sirena/common/utils';
import { z } from 'zod';
import { splitCsv } from '../../helpers/string.js';

// La sentinelle « Non renseigné » est une valeur cochable comme les autres : elle est acceptée par
// les filtres multi-sélection et transmise telle quelle à Metabase, où le SQL de chaque carte la
// reconnaît pour retenir les lignes dont le champ est NULL. Voir docs/metabase_dashboards/FILTERS.md.
const DOMAINE_IDS: string[] = [...Object.values(DOMAINES_FONCTIONNELS), FILTRE_NON_RENSEIGNE];
const LIEU_TYPE_IDS: string[] = Object.values(LIEU_TYPE);
const CSV_FILTER_MAX = 500;

const isValidLieuToken = (token: string): boolean => {
  if (estNonRenseigne(token)) return true;
  const [lieuTypeId, precision, rest] = token.split(':');
  if (rest !== undefined || !LIEU_TYPE_IDS.includes(lieuTypeId)) return false;
  if (precision === undefined) return true;
  return lieuPrecisionLabelsByType[lieuTypeId]?.[precision] !== undefined;
};

const domaineIdsSchema = z
  .string()
  .max(CSV_FILTER_MAX)
  .refine((value) => splitCsv(value).every((id) => DOMAINE_IDS.includes(id)), {
    message: 'Domaine(s) fonctionnel(s) invalide(s)',
  })
  .optional()
  .transform((value) => {
    const ids = [...new Set(splitCsv(value))];
    return ids.length > 0 ? ids.join(',') : undefined;
  });

const lieuTypesSchema = z
  .string()
  .max(CSV_FILTER_MAX)
  .refine((value) => splitCsv(value).every(isValidLieuToken), {
    message: 'Type(s) de lieu invalide(s)',
  })
  .optional()
  .transform((value) => {
    const tokens = [...new Set(splitCsv(value))];
    return tokens.length > 0 ? tokens.join(',') : undefined;
  });

export const StatisticsDashboardQuerySchema = z
  .object({
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    domaineIds: domaineIdsSchema,
    includeEIG: z.enum(['false']).optional(),
    lieuTypes: lieuTypesSchema,
  })
  .refine((q) => !q.startDate || !q.endDate || q.startDate <= q.endDate, {
    message: 'startDate doit être antérieure ou égale à endDate',
    path: ['startDate'],
  });

export type StatisticsDashboardQuery = z.infer<typeof StatisticsDashboardQuerySchema>;

export const StatisticsDashboardCardLayoutSchema = z.object({
  col: z.number().int(),
  row: z.number().int(),
  sizeX: z.number().int(),
  sizeY: z.number().int(),
});

export const MetabaseColumnSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  base_type: z.string(),
  semantic_type: z.string().nullable(),
  source: z.string().nullable(),
});

export const MetabaseCardDataSchema = z.object({
  cols: z.array(MetabaseColumnSchema),
  rows: z.array(z.array(z.unknown())),
});

export const StatisticsDashboardTabSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  position: z.number().int(),
});

export const StatisticsDashboardCardSchema = z.object({
  id: z.number().int(),
  dashcardId: z.number().int(),
  tabId: z.number().int().nullable(),
  filterSlugs: z.array(z.string()),
  name: z.string(),
  description: z.string().nullable(),
  display: z.string().nullable(),
  layout: StatisticsDashboardCardLayoutSchema.nullable(),
  data: MetabaseCardDataSchema,
});

export const StatisticsDashboardPayloadSchema = z.object({
  tabs: z.array(StatisticsDashboardTabSchema),
  cards: z.array(StatisticsDashboardCardSchema),
});
