#!/usr/bin/env node

/**
 * CLI tool to manage third-party API keys
 *
 * Usage:
 *   pnpm run op:manage-api-keys account create <name>
 *   pnpm run op:manage-api-keys account list
 *   pnpm run op:manage-api-keys key create <accountId>
 *   pnpm run op:manage-api-keys key list [accountId]
 *   pnpm run op:manage-api-keys key revoke <keyId>
 */

import { generateApiKey } from '../libs/apiKey.js';
import { prisma } from '../libs/prisma.js';

const [, , entity, action, ...args] = process.argv;

try {
  if (entity === 'account') {
    if (action === 'create') {
      const [name] = args;
      if (!name) {
        console.error('Usage: account create <name>');
        process.exit(1);
      }

      const account = await prisma.thirdPartyAccount.create({
        data: { name },
      });
      console.log('✅ Account created');
      console.log('ID:', account.id);
      console.log('Name:', account.name);
      console.log('Created:', account.createdAt.toISOString());
    } else if (action === 'list') {
      const accounts = await prisma.thirdPartyAccount.findMany({
        include: {
          _count: { select: { apiKeys: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      console.log(`\n📋 Accounts (${accounts.length}):`);
      accounts.forEach((account) => {
        console.log(`\nID: ${account.id}`);
        console.log(`Name: ${account.name}`);
        console.log(`Keys: ${account._count.apiKeys}`);
        console.log(`Created: ${account.createdAt.toISOString()}`);
      });
    }
  } else if (entity === 'key') {
    if (action === 'create') {
      const [accountId] = args;
      if (!accountId) {
        console.error('Usage: key create <accountId>');
        process.exit(1);
      }

      const { key, hash, prefix } = generateApiKey();
      const apiKey = await prisma.apiKey.create({
        data: {
          accountId,
          keyHash: hash,
          keyPrefix: prefix,
        },
      });

      console.log('✅ API Key created');
      console.log('\n⚠️  SAVE THIS KEY NOW - it will not be shown again:');
      console.log(`\n${key}\n`);
      console.log('Key ID:', apiKey.id);
      console.log('Status:', apiKey.status);
    } else if (action === 'list') {
      const [accountId] = args;
      const keys = await prisma.apiKey.findMany({
        where: accountId ? { accountId } : undefined,
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`\n🔑 API Keys (${keys.length}):`);
      keys.forEach((key) => {
        console.log(`\nID: ${key.id}`);
        console.log(`Account: ${key.account.name} (${key.accountId})`);
        console.log(`Prefix: ${key.keyPrefix}`);
        console.log(`Status: ${key.status}`);
        console.log(`Last used: ${key.lastUsedAt?.toISOString() || 'Never'}`);
        console.log(`Created: ${key.createdAt.toISOString()}`);
      });
    } else if (action === 'revoke') {
      const [keyId] = args;
      if (!keyId) {
        console.error('Usage: key revoke <keyId>');
        process.exit(1);
      }

      const apiKey = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      console.log('✅ API Key revoked');
      console.log('ID:', apiKey.id);
      console.log('Status:', apiKey.status);
    }
  } else {
    console.log('Usage:');
    console.log('  account create <name>');
    console.log('  account list');
    console.log('  key create <accountId>');
    console.log('  key list [accountId]');
    console.log('  key revoke <keyId>');
  }
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
