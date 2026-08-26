export const FEATURE_FLAGS = {
  //definitive FF : will be used to disable/enable update banner following PO decisions
  UPDATE_BANNER: 'UPDATE_BANNER',
  // temporary FF to enable/disable predefined periods in the statistics period filter
  STATISTICS_PERIOD_PRESETS: 'STATISTICS_PERIOD_PRESETS',
  // Email-targeted FF for the SIREC migration admin screen
  SIREC_MIGRATION: 'SIREC_MIGRATION',
  // Temporary FF for the Admin local directions/services rollout
  ADMIN_LOCAL_DIRECTIONS_SERVICES: 'ADMIN_LOCAL_DIRECTIONS_SERVICES',
  // Temporary FF for sharing processing steps between affected root entities
  SHARED_PROCESSING_STEPS: 'SHARED_PROCESSING_STEPS',
  // Temporary FF to enable/disable the reminder configuration on a processing step
  ETAPE_RAPPEL: 'ETAPE_RAPPEL',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
