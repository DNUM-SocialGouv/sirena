export const ROLES = {
  PENDING: 'PENDING',
  READER: 'READER',
  WRITER: 'WRITER',
  NATIONAL_STEERING: 'NATIONAL_STEERING',
  ENTITY_ADMIN: 'ENTITY_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export const roles: Record<keyof typeof ROLES, string> = {
  PENDING: "En attente d'affectation",
  READER: 'Agent en lecture',
  WRITER: 'Agent en écriture',
  NATIONAL_STEERING: 'Pilotage national',
  ENTITY_ADMIN: 'Admin local',
  SUPER_ADMIN: 'Super administrateur',
} as const;
