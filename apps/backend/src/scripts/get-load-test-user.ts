#!/usr/bin/env node

/**
 * Print env vars for k6 load tests: picks an ACTIF user attached to an entité.
 *
 * Usage:
 *   pnpm op:get-load-test-user            # print id + role on stdout
 *   pnpm op:get-load-test-user --email x  # pick a specific user by email
 */

import { STATUT_TYPES } from '@sirena/common/constants';
import { prisma } from '../libs/prisma.js';

const emailFlagIndex = process.argv.indexOf('--email');
const emailFilter = emailFlagIndex >= 0 ? process.argv[emailFlagIndex + 1] : null;

const user = await prisma.user.findFirst({
  where: {
    statutId: STATUT_TYPES.ACTIF,
    entiteId: { not: null },
    ...(emailFilter ? { email: emailFilter } : {}),
  },
  orderBy: { createdAt: 'asc' },
  select: { id: true, roleId: true, email: true, entiteId: true },
});

if (!user) {
  const reason = emailFilter
    ? `No ACTIF user with email "${emailFilter}" attached to an entité.`
    : 'No ACTIF user attached to an entité found in this database.';
  console.error(reason);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`# user=${user.email} entiteId=${user.entiteId}`);
console.log(`LOAD_TEST_USER_ID=${user.id}`);
console.log(`LOAD_TEST_ROLE_ID=${user.roleId}`);

await prisma.$disconnect();
