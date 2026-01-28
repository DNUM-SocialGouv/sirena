# @sirena/backend

**Backend package** of the Sirena project.  
Built with [Hono](https://hono.dev/), [Zod](https://github.com/colinhacks/zod), and OpenAPI-first design.  
Compiled using [`tsc`](https://github.com/microsoft/TypeScript).

---

## 📦 Project structure

```plaintext
src/
├── app.ts              → App entry (Hono instance).
├── features/           → Feature-based routes, services, schemas.
│   └── users/
│       ├── users.controller.ts
│       ├── users.route.ts
│       ├── users.schema.ts
│       └── users.service.ts
│   └── roles/
│       ├── roles.controller.ts
│       ├── roles.route.ts
│       ├── roles.schema.ts
│       └── roles.service.ts
├── hc.ts               → RPC-style client factory using `hono-client`.
├── helpers/            → Internal helpers, error utils.
├── middlewares/        → Custom middlewares (e.g., logger).
├── schemas/            → Shared schemas (e.g., error format).
├── swagger/            → OpenAPI generation and static export.
├── types/              → Type declarations shared across codebases.
└── index.ts            → Main entry point (server bootstrap).
```

## 🚀 Scripts

| Command                 | Description                                                                   |
| :---------------------- | :---------------------------------------------------------------------------- |
| `pnpm build`            | Compile TypeScript sources using `tsconfig.build.json`                        |
| `pnpm dev`              | Start the backend in development mode with `tsx` watching `src/index.ts`      |
| `pnpm test`             | Run unit tests using Vitest                                                   |
| `pnpm db:generate`      | Generate the Prisma client from the schema                                    |
| `pnpm db:migrate`       | Apply pending migrations in development (`prisma migrate dev`)                |
| `pnpm db:seed`          | Apply seeds to the database                                                   |
| `pnpm db:deploy`        | Deploy all pending migrations to the database (`prisma migrate deploy`)       |
| `pnpm db:diff`          | Create a SQL migration script comparing DB to the current schema              |
| `pnpm db:diff-down`     | Create a SQL rollback script comparing schema to current DB                   |
| `pnpm db:execute`       | Execute a sql script to DB                                                    |
| `pnpm db:reset`         | Reset the database by dropping and recreating it with migrations (`--force`)  |
| `pnpm db:push`          | Push the Prisma schema directly to the database without generating migrations |
| `pnpm db:studio`        | Launch Prisma Studio UI for exploring and modifying the database              |
| `pnpm generate:openAPI` | Run a custom TypeScript script to generate the OpenAPI specification          |
| `pnpm generate:codegen` | Generate clients for graphql requests                                         |
| `pnpm lint:staged`      | Run Biome lint checks on staged backend files via a Git diff filter           |
| `pnpm lint`             | Run Biome lint checks across the entire backend codebase                      |
| `pnpm op:diff:autorite-competente:analyze` | Analyze differences between CSV referentiel and database (AutoriteCompetenteReferentiel) |
| `pnpm op:diff:autorite-competente:up` | Generate up migration SQL (INSERT statements) from CSV referentiel differences |
| `pnpm op:diff:autorite-competente:down` | Generate down migration SQL (DELETE statements) from CSV referentiel differences |

## 📦 Exports

The package exposes:

```json
  "exports": {
    ".": {
      "import": {
        "types": "./dist/src/index.d.ts",
        "default": "./dist/src/index.js"
      }
    },
    "./swagger": "./src/swagger/openAPI.json",
    "./hc": {
      "import": {
        "types": "./dist/src/hc.d.ts",
        "default": "./dist/src/hc.js"
      }
    }
  }
```

| Path | Description |
|:--|:--|
| `@sirena/backend/hc` | Hono-compatible typed client (`hcWithType`) for RPC-style API access. |
| `@sirena/backend/swagger` | The OpenAPI schema JSON, usable by frontend generators or previewers. |

### 💡 Example: Using the typed client

```ts
import { hcWithType } from '@sirena/backend/hc';

const client = hcWithType('/api');

export async function fetchUserById(id: string) {
  const res = await client.users[':id'].$get({ param: { id } });
  if (!res.ok) throw new Error('Failed to fetch user');
  return await res.json();
}
```

## Environment Variables

### Logging Configuration

The backend supports several logging-related environment variables:

- `LOG_LEVEL`: Controls console log output level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). Default: `info`
- `LOG_LEVEL_SENTRY`: Controls minimum level for Sentry integration (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). Default: `warn`
- `LOG_FORMAT`: Output format (`json` or `pretty`). Default: `json`
- `LOG_EXTRA_CONTEXT`: Additional context tags for logs in `key=value` comma-separated format

#### LOG_EXTRA_CONTEXT

You can add custom context tags to all log entries using the `LOG_EXTRA_CONTEXT` environment variable. This is particularly useful for container deployments where you want to add environment, service, or deployment-specific context.

**Format**: `key1=value1,key2=value2,key3=value3`

## Prisma Migration Guide

### Create an Up Migration

1 Edit your Prisma schema (prisma/schema.prisma) to include the desired changes.
2 Create a down migration.

```bash
pnpm db:diff-down # down.sql created in apps/backend/prisma
```

3 Create the migration.

```bash
pnpm db:migrate <name>
```

4 Copy the down.sql in the migration directory.

```bash
cp apps/backend/prisma/down.sql apps/backend/prisma/<timestamp>_<name>
```

### Applying a Down Migration

1 Run the down script against the database.

```bash
pnpm db:execute prisma/migrations/<timestamp>_<name>/down.sql
```

2 Mark the migration as rolled back

```bash
# in pgsql
DELETE FROM "_prisma_migrations" WHERE migration_name = <timestamp>_<name>;
# or if migration failed
pnpm db:migrate:resolve <timestamp>_<name>
```
