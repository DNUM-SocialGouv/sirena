import { ROLES, type Role, STATUT_TYPES } from '@sirena/common/constants';
import { type Prisma, prisma } from '../../libs/prisma.js';
import type { ArsEntites } from './entites.js';
import { resolveArsByRegLib } from './entites.js';
import type { CustomUserInput } from './types.js';

export type SeededUser = {
  email: string;
  role: Role;
  entite: string | null;
};

type UserSpec = {
  email: string;
  prenom: string;
  nom: string;
  role: Role;
  statut: string;
  entiteId: string | null;
  entiteLabel: string | null;
};

/**
 * Creates (or updates) a user, idempotent by email: replaying the seed never
 * creates a duplicate. ProConnect identifiers (uid/sub) are synthetic and
 * stable — at real login, matching is done by email.
 */
const upsertUser = async (spec: UserSpec): Promise<SeededUser> => {
  // Derive the synthetic ProConnect ids from the full email (which is unique),
  // not just the local-part — otherwise a custom `reader@x.fr` would collide on
  // the unique uid/sub with the default `reader@yopmail.com`.
  const syntheticId = `seed-${spec.email}`;
  const pcData = {
    email: spec.email,
    sub: syntheticId,
    given_name: spec.prenom,
    usual_name: spec.nom,
  } satisfies Prisma.InputJsonObject;

  await prisma.user.upsert({
    where: { email: spec.email },
    update: {
      prenom: spec.prenom,
      nom: spec.nom,
      roleId: spec.role,
      statutId: spec.statut,
      entiteId: spec.entiteId,
    },
    create: {
      email: spec.email,
      prenom: spec.prenom,
      nom: spec.nom,
      uid: syntheticId,
      sub: syntheticId,
      pcData,
      roleId: spec.role,
      statutId: spec.statut,
      entiteId: spec.entiteId,
    },
  });

  return { email: spec.email, role: spec.role, entite: spec.entiteLabel };
};

/**
 * Default user set: the 3 requested ones + one per remaining role, so the UI
 * and permissions can be tested under each role.
 */
const defaultUserSpecs = (entites: ArsEntites): UserSpec[] => [
  {
    email: 'user@yopmail.com',
    prenom: 'Super',
    nom: 'Admin',
    role: ROLES.SUPER_ADMIN,
    statut: STATUT_TYPES.ACTIF,
    entiteId: null,
    entiteLabel: null,
  },
  {
    email: 'user18@yopmail.com',
    prenom: 'Admin',
    nom: 'Normandie',
    role: ROLES.ENTITY_ADMIN,
    statut: STATUT_TYPES.ACTIF,
    entiteId: entites.normandie.id,
    entiteLabel: entites.normandie.nomComplet,
  },
  {
    email: 'user19@yopmail.com',
    prenom: 'Admin',
    nom: 'Île-de-France',
    role: ROLES.ENTITY_ADMIN,
    statut: STATUT_TYPES.ACTIF,
    entiteId: entites.idf.id,
    entiteLabel: entites.idf.nomComplet,
  },
  {
    email: 'reader@yopmail.com',
    prenom: 'Agent',
    nom: 'Lecture',
    role: ROLES.READER,
    statut: STATUT_TYPES.ACTIF,
    entiteId: entites.normandie.id,
    entiteLabel: entites.normandie.nomComplet,
  },
  {
    email: 'writer@yopmail.com',
    prenom: 'Agent',
    nom: 'Écriture',
    role: ROLES.WRITER,
    statut: STATUT_TYPES.ACTIF,
    entiteId: entites.normandie.id,
    entiteLabel: entites.normandie.nomComplet,
  },
  {
    email: 'pilotage@yopmail.com',
    prenom: 'Pilotage',
    nom: 'National',
    role: ROLES.NATIONAL_STEERING,
    statut: STATUT_TYPES.ACTIF,
    entiteId: entites.idf.id,
    entiteLabel: entites.idf.nomComplet,
  },
  {
    email: 'pending@yopmail.com',
    prenom: 'En',
    nom: 'Attente',
    role: ROLES.PENDING,
    statut: STATUT_TYPES.NON_RENSEIGNE,
    entiteId: null,
    entiteLabel: null,
  },
];

/**
 * Turns a CLI custom user into a spec (resolves the entity if requested).
 */
const customUserToSpec = async (custom: CustomUserInput): Promise<UserSpec> => {
  const entite = custom.entiteRegLib ? await resolveArsByRegLib(custom.entiteRegLib) : null;
  return {
    email: custom.email,
    prenom: 'Utilisateur',
    nom: 'Custom',
    role: custom.role,
    statut: STATUT_TYPES.ACTIF,
    entiteId: entite?.id ?? null,
    entiteLabel: entite?.nomComplet ?? null,
  };
};

/**
 * Creates the default users then the custom users. Returns the list for the recap.
 */
export const seedUsers = async (entites: ArsEntites, customUsers: CustomUserInput[]): Promise<SeededUser[]> => {
  const specs = defaultUserSpecs(entites);
  for (const custom of customUsers) {
    specs.push(await customUserToSpec(custom));
  }

  const created: SeededUser[] = [];
  for (const spec of specs) {
    created.push(await upsertUser(spec));
  }
  return created;
};
