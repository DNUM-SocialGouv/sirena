export const FEATURE_FLAGS = {} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
