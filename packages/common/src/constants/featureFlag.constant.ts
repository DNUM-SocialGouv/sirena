export const FEATURE_FLAGS = {
  //definitive FF : will be used to disable/enable update banner following PO decisions
  UPDATE_BANNER: 'UPDATE_BANNER',
  // temporary FF to enable/disable statistics page for all users
  STATISTICS: 'STATISTICS',
  // Email-targeted FF for the SIREC migration admin screen
  SIREC_MIGRATION: 'SIREC_MIGRATION',
  // Temporary FF for the Admin local directions/services rollout
  ADMIN_LOCAL_DIRECTIONS_SERVICES: 'ADMIN_LOCAL_DIRECTIONS_SERVICES',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
