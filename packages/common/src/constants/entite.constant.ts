export const entiteTypes = {
  ARS: 'ARS',
  DD: 'DD',
  CD: 'CD',
} as const;

export type EntiteType = keyof typeof entiteTypes;
