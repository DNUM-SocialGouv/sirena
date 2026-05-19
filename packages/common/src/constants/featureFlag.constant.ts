export const FEATURE_FLAGS = {
  UPDATE_BANNER: 'UPDATE_BANNER',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
