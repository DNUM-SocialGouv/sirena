export const ROLES = {
  PENDING: 'PENDING',
  READER: 'READER',
  WRITER: 'WRITER',
  NATIONAL_STEERING: 'NATIONAL_STEERING',
  ENTITY_ADMIN: 'ENTITY_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type Role = keyof typeof ROLES;

export const ROLES_READ = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER] as const;

export const ROLES_WRITE = [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER] as const;

export const ROLES_ADMIN = [ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN] as const;

export const roles: Record<Role, string> = {
  [ROLES.PENDING]: "En attente d'affectation",
  [ROLES.READER]: 'Agent en lecture',
  [ROLES.WRITER]: 'Agent en écriture',
  [ROLES.NATIONAL_STEERING]: 'Pilotage national',
  [ROLES.ENTITY_ADMIN]: 'Admin local',
  [ROLES.SUPER_ADMIN]: 'Super administrateur',
} as const;

export const roleRanks = {
  [ROLES.SUPER_ADMIN]: 5,
  [ROLES.ENTITY_ADMIN]: 4,
  [ROLES.NATIONAL_STEERING]: 3,
  [ROLES.WRITER]: 2,
  [ROLES.READER]: 1,
  [ROLES.PENDING]: 0,
};

export type RoleOption = {
  key: Role;
  value: string;
};
