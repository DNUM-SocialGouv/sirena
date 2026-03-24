import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.PG_URL ?? 'postgresql://localhost:5432/sirena', // Fallback used for generate in CI
  },
});
