type CacheItem<T> = {
  data: T;
  expiresAt: number;
};

type CacheOptions<T, Args extends SerializableKeyTuple> = {
  ttlMs: number;
  fetcher: (...args: Args) => Promise<T>;
};

type Primitive = string | number | boolean | null;
type SerializableKeyPart = Primitive | undefined; // optional args allowed
type SerializableKeyTuple = readonly SerializableKeyPart[];

function serializeKey(key: SerializableKeyTuple): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

export class CacheEntity<T, Args extends SerializableKeyTuple> {
  private store = new Map<string, CacheItem<T>>();
  private ttlMs: number;
  private fetcher: (...args: Args) => Promise<T>;

  constructor(options: CacheOptions<T, Args>) {
    this.ttlMs = options.ttlMs;
    this.fetcher = options.fetcher;
  }

  has(...args: Args): boolean {
    const key = serializeKey(args);
    const item = this.store.get(key);
    return !!item && item.expiresAt > Date.now();
  }

  getSync(...args: Args): T | undefined {
    const key = serializeKey(args);
    const item = this.store.get(key);
    return item && item.expiresAt > Date.now() ? item.data : undefined;
  }

  async get(...args: Args): Promise<T> {
    const key = serializeKey(args);
    const item = this.store.get(key);

    if (item && item.expiresAt > Date.now()) {
      return item.data;
    }

    const data = await this.fetcher(...args);
    this.set(data, ...args);
    return data;
  }

  set(data: T, ...args: Args): void {
    const key = serializeKey(args);
    this.store.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(...args: Args): void {
    const key = serializeKey(args);
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
