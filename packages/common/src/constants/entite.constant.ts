export const entiteTypes = {
  ARS: 'ARS',
  DDETS: 'DDETS',
  CD: 'CD',
} as const;

export type EntiteType = keyof typeof entiteTypes;
