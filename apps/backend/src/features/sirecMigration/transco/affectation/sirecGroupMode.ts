export const SIREC_GROUP_MODE = {
  LECTURE: 'LECTURE',
  ECRITURE: 'ECRITURE',
} as const;

export type SirecGroupMode = (typeof SIREC_GROUP_MODE)[keyof typeof SIREC_GROUP_MODE];
