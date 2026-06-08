export const FEATURE_FLAGS = {
  //definitive FF : will be used to disable/enable update banner following PO decisions
  UPDATE_BANNER: 'UPDATE_BANNER',
  // temporary FF to enable/disable statistics page for all users
  STATISTICS: 'STATISTICS',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
