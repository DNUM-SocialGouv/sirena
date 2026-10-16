import { CacheEntity } from '@sirena/backend-utils/helpers';
import { CACHE_INVALIDATION_SCOPES, cacheInvalidationBus } from '../../helpers/cacheInvalidation.js';
import { getEntiteAscendanteInfo } from './entites.ascendants.js';
import { getEntitesHierarchySnapshot } from './entites.chains.js';
import { getEntiteDescendantIds } from './entites.descendants.js';

export const DESCENDANT_IDS_CACHE_TTL_MS = 5 * 60 * 1000;
export const ENTITES_HIERARCHY_CACHE_TTL_MS = 5 * 60 * 1000;
export const ASCENDANTE_INFO_CACHE_TTL_MS = 5 * 60 * 1000;

export const entitesDescendantIdsCache = new CacheEntity<
  Awaited<ReturnType<typeof getEntiteDescendantIds>>,
  [string | null]
>({
  ttlMs: DESCENDANT_IDS_CACHE_TTL_MS,
  fetcher: getEntiteDescendantIds,
});

export const entiteAscendanteInfoCache = new CacheEntity<Awaited<ReturnType<typeof getEntiteAscendanteInfo>>, [string]>(
  {
    ttlMs: ASCENDANTE_INFO_CACHE_TTL_MS,
    fetcher: getEntiteAscendanteInfo,
  },
);

export const entitesHierarchyCache = new CacheEntity<Awaited<ReturnType<typeof getEntitesHierarchySnapshot>>, []>({
  ttlMs: ENTITES_HIERARCHY_CACHE_TTL_MS,
  fetcher: getEntitesHierarchySnapshot,
});

cacheInvalidationBus.register(CACHE_INVALIDATION_SCOPES.ENTITES_PERIMETRE, () => {
  entitesDescendantIdsCache.clear();
  entiteAscendanteInfoCache.clear();
  entitesHierarchyCache.clear();
});
