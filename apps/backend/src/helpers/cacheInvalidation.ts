export const CACHE_INVALIDATION_SCOPES = {
  ENTITES_PERIMETRE: 'entites:perimetre',
} as const;

export type CacheInvalidationScope = (typeof CACHE_INVALIDATION_SCOPES)[keyof typeof CACHE_INVALIDATION_SCOPES];

const KNOWN_SCOPES = new Set<string>(Object.values(CACHE_INVALIDATION_SCOPES));

export const isCacheInvalidationScope = (scope: unknown): scope is CacheInvalidationScope =>
  typeof scope === 'string' && KNOWN_SCOPES.has(scope);

type InvalidationHandler = () => void;
type InvalidationPublisher = (scope: CacheInvalidationScope) => void;

/**
 * In-memory caches live in a single process, so an invalidation only reaches the instance that
 * handled the write. The bus clears the local caches right away and hands the scope to a publisher
 * (wired to Redis at startup) so the other API pods and the worker drop their copy too.
 */
class CacheInvalidationBus {
  private handlers = new Map<CacheInvalidationScope, Set<InvalidationHandler>>();
  private publisher: InvalidationPublisher | null = null;

  register(scope: CacheInvalidationScope, handler: InvalidationHandler): void {
    const handlers = this.handlers.get(scope) ?? new Set<InvalidationHandler>();
    handlers.add(handler);
    this.handlers.set(scope, handlers);
  }

  setPublisher(publisher: InvalidationPublisher | null): void {
    this.publisher = publisher;
  }

  invalidate(scope: CacheInvalidationScope): void {
    this.run(scope);
    this.publisher?.(scope);
  }

  /** Invalidation broadcast by another instance: clear locally, never re-broadcast. */
  receive(scope: CacheInvalidationScope): void {
    this.run(scope);
  }

  private run(scope: CacheInvalidationScope): void {
    for (const handler of this.handlers.get(scope) ?? []) {
      handler();
    }
  }
}

export const cacheInvalidationBus = new CacheInvalidationBus();
