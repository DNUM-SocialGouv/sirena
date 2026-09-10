import { z } from 'zod';

export interface ConflictInfo<T = Record<string, unknown>> {
  field: keyof T;
  originalValue: unknown;
  currentValue: unknown;
  serverValue: unknown;
}

export interface MergeResult<T = Record<string, unknown>> {
  merged: T;
  conflicts: ConflictInfo<T>[];
  hasConflicts: boolean;
  canAutoResolve: boolean;
}

export function detectAndMergeConflicts<T extends Record<string, unknown>>(
  original: T,
  current: T,
  server: T,
): MergeResult<T> {
  const conflicts: ConflictInfo<T>[] = [];
  // Keys come from server payloads: a prototype-less object keeps `__proto__` from reassigning the prototype.
  const merged = Object.create(null) as Record<string, unknown>;

  const allKeys = new Set([
    ...Object.keys(original || {}),
    ...Object.keys(current || {}),
    ...Object.keys(server || {}),
  ]) as Set<keyof T>;

  for (const key of allKeys) {
    const originalValue = original?.[key as string];
    const currentValue = current?.[key as string];
    const serverValue = server?.[key as string];

    const userModified = !isEqual(originalValue, currentValue);
    const serverModified = !isEqual(originalValue, serverValue);

    if (userModified && serverModified && !isEqual(currentValue, serverValue)) {
      conflicts.push({
        field: key,
        originalValue,
        currentValue,
        serverValue,
      });

      merged[key as string] = currentValue;
    } else if (userModified && !serverModified) {
      merged[key as string] = currentValue;
    } else if (!userModified && serverModified) {
      merged[key as string] = serverValue;
    } else {
      merged[key as string] = currentValue ?? serverValue ?? originalValue;
    }
  }

  const canAutoResolve = conflicts.length === 0;

  return {
    merged: { ...merged } as T,
    conflicts,
    hasConflicts: conflicts.length > 0,
    canAutoResolve,
  };
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!isEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}

/** Replay cap after an automatic merge, so continuous contention stops instead of looping on toasts. */
export const MAX_AUTO_MERGE_REPLAYS = 2;

const conflictPayloadSchema = z.object({
  serverData: z.unknown().optional(),
  serverUpdatedAt: z.string().optional(),
});

export type ConflictPayload = z.infer<typeof conflictPayloadSchema>;

/** `conflictData` is the pre-unification shape, still read so a tab loaded before a deployment keeps working. */
export function extractConflictPayload(body: unknown): ConflictPayload {
  if (!body || typeof body !== 'object') return {};

  const { cause, conflictData } = body as { cause?: unknown; conflictData?: unknown };
  const parsed = conflictPayloadSchema.safeParse(cause ?? conflictData);

  return parsed.success ? parsed.data : {};
}

function isTraversableObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNullPrototypeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === null;
}

function isEmptyPlainObject(value: unknown): boolean {
  return isTraversableObject(value) && Object.keys(value).length === 0;
}

function collectConflictPaths(source: Record<string, unknown>, prefix: string, flat: Record<string, unknown>): void {
  const keys = Object.keys(source);

  // An empty object stays a leaf: dropping it would read as "section absent", which merges as a change.
  if (prefix && keys.length === 0) {
    flat[prefix] = {};
    return;
  }

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const child = source[key];

    if (isTraversableObject(child)) {
      collectConflictPaths(child, path, flat);
      continue;
    }

    flat[path] = child;
  }
}

/**
 * Turns a nested record into dotted paths so a disagreement is arbitrated leaf by leaf. Arrays stay
 * atomic: split per index, a single insertion would conflict on every position after it.
 */
export function flattenConflictPaths(value: unknown): Record<string, unknown> {
  if (!isTraversableObject(value)) return {};

  const flat = Object.create(null) as Record<string, unknown>;
  collectConflictPaths(value, '', flat);

  return { ...flat };
}

function materializeConflictPaths(node: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (isNullPrototypeObject(child)) {
      node[key] = materializeConflictPaths(child);
    }
  }

  return { ...node };
}

/** Rebuilds the nested record `flattenConflictPaths` produced. */
export function unflattenConflictPaths(flat: Record<string, unknown>): Record<string, unknown> {
  const root = Object.create(null) as Record<string, unknown>;

  for (const path of Object.keys(flat)) {
    const segments = path.split('.');
    const leaf = segments.pop() as string;
    let node = root;

    for (const segment of segments) {
      if (!isNullPrototypeObject(node[segment])) {
        node[segment] = Object.create(null);
      }
      node = node[segment] as Record<string, unknown>;
    }

    // A branch built from a deeper path wins over an empty-object leaf, whatever order they arrive in.
    if (isNullPrototypeObject(node[leaf]) && isEmptyPlainObject(flat[path])) continue;

    node[leaf] = flat[path];
  }

  return materializeConflictPaths(root);
}
