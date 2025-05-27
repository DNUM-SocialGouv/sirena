import type { Primitive } from '@/utils/types';

export function isPrimitive(x: unknown): x is Primitive {
  return (
    x === null ||
    typeof x === 'string' ||
    typeof x === 'number' ||
    typeof x === 'boolean' ||
    typeof x === 'bigint' ||
    typeof x === 'symbol'
  );
}
