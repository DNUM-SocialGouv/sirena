type Order = 'asc' | 'desc';

type SortObject<K extends string, O extends Order> = K extends `${infer A}.${infer B}`
  ? { [P in A]: SortObject<B, O> }
  : { [P in K]: O };

export function sortObject<K extends string, O extends Order>(sort: K, order: O): SortObject<K, O> {
  if (sort.includes('.')) {
    const [first, ...rest] = sort.split('.');
    return { [first]: sortObject(rest.join('.'), order) } as SortObject<K, O>;
  }
  return { [sort]: order } as SortObject<K, O>;
}
