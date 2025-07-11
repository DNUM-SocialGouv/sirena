import { CacheEntity } from '@sirena/backend-utils/helpers';
import { getEntiteDescendantIds } from '@/features/entites/entites.service';

export const entitesDescendantIdsCache = new CacheEntity<
  Awaited<ReturnType<typeof getEntiteDescendantIds>>,
  [string | null]
>({
  ttlMs: 24 * 60 * 60 * 1000,
  fetcher: getEntiteDescendantIds,
});
