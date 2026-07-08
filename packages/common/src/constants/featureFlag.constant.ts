export const FEATURE_FLAGS = {
  //definitive FF : will be used to disable/enable update banner following PO decisions
  UPDATE_BANNER: 'UPDATE_BANNER',
  // temporary FF to enable/disable statistics page for all users
  STATISTICS: 'STATISTICS',
  // temporary FF to enable/disable predefined periods in the statistics period filter
  STATISTICS_PERIOD_PRESETS: 'STATISTICS_PERIOD_PRESETS',
  // Email-targeted FF for the SIREC migration admin screen
  SIREC_MIGRATION: 'SIREC_MIGRATION',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
