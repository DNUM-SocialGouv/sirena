export const FEATURE_FLAGS = {
  //definitive FF : will be used to disable/enable update banner following PO decisions
  UPDATE_BANNER: 'UPDATE_BANNER',
  // temporary FF to enable/disable statistics page for all users
  STATISTICS: 'STATISTICS',
  // FF ciblé par email pour l'écran admin de migration SIREC
  SIREC_MIGRATION: 'SIREC_MIGRATION',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
