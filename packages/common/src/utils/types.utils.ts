export type RequiredByKey<T, K extends keyof T> = {
  [P in K]: T[P];
} & Partial<Omit<T, K>>;
